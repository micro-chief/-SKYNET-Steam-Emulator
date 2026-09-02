using System.Diagnostics;
using System.Security.Cryptography;
using SKYNET.Client.Models;

namespace SKYNET.Client.Services;

public sealed class LaunchResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public Process? Process { get; set; }
    public bool UsedStaticImportRedirection { get; set; }

    public static LaunchResult Fail(string error) => new() { Success = false, Error = error };
    public static LaunchResult Ok(Process p, bool usedStaticImportRedirection) => new()
    {
        Success = true,
        Process = p,
        UsedStaticImportRedirection = usedStaticImportRedirection
    };
}

/// <summary>
/// Launches a game with the SKYNET emulator resolved before Steam API calls begin.
/// The game exe is created suspended,
/// the emulator DLL shipped in the launcher's payload folder is copied to an
/// isolated per-build shadow path and injected via
/// CreateRemoteThread(LoadLibraryW), then the process is resumed. Because the game
/// loads steam_api64.dll dynamically by bare name, the loader returns our
/// already-loaded module for its later LoadLibrary("steam_api64.dll"), so the game
/// uses our emulator without the original file ever being touched. See DllInjector.
/// The shadow path keeps Windows' loader lock away from the launcher's payload,
/// so rebuilding the client can refresh its bundled DLL while a launched game is
/// still running.
///
/// Unreal delay-load plugins that insist on an absolute dependency path receive a
/// private, temporary alias beside their original Steam DLL. The original file is
/// never replaced, and the alias is marker-owned and removed on exit or recovery.
/// RecoverOrphans also cleans up any DLL swap left by an older launcher version.
/// </summary>
public sealed class GameLauncher
{
    private const string BackupSuffix = ".skynet-orig";
    private const string MarkerSuffix = ".skynet-injected";
    private const int PreviousPayloadShadowsToKeep = 3;

    private static string PayloadDll(GameArch arch)
    {
        var rel = arch == GameArch.X64
            ? Path.Combine("payload", "x64", "steam_api64.dll")
            : Path.Combine("payload", "x86", "steam_api.dll");
        return Path.Combine(AppContext.BaseDirectory, rel);
    }

    public event Action<GameEntry>? GameExited;

    public LaunchResult Launch(GameEntry game, AppConfig app, WebUser? user, string? extraArgs = null)
    {
        if (!game.ExeExists)
            return LaunchResult.Fail($"Executable not found:\n{game.ExecutablePath}");

        // The PE header is authoritative. A stale/manual architecture selection
        // must never make us inject an x86 DLL into an x64 executable (or vice versa).
        var detectedArch = PeArch.Detect(game.ExecutablePath);
        var arch = detectedArch != GameArch.Unknown ? detectedArch : game.Arch;
        if (arch == GameArch.Unknown)
            return LaunchResult.Fail("Could not determine game architecture (x86/x64).");

        var payload = PayloadDll(arch);
        if (!File.Exists(payload))
            return LaunchResult.Fail($"Emulator payload missing:\n{payload}");

        // The emulator resolves steam_api.ini / logs from the game process's own
        // exe folder (Common.GetPath uses MainModule), so the payload DLL can stay
        // in the launcher's payload directory while per-game config lives with the game.
        try
        {
            IniWriter.Write(game, app, user);
        }
        catch (Exception ex)
        {
            return LaunchResult.Fail($"Failed to write steam_api.ini:\n{ex.Message}");
        }

        var steamImportName = Path.GetFileName(payload);
        var delayImportNameRvas = PeImports.FindDelayImportNameRvas(game.ExecutablePath, steamImportName);
        var hasDelaySteamImport = delayImportNameRvas.Count != 0;
        var hasStaticSteamImport = PeImports.ImportsModule(game.ExecutablePath, steamImportName);
        Process proc;
        IReadOnlyList<string> stagedDelayAliases = Array.Empty<string>();
        try
        {
            var workDir = ResolveWorkingDirectory(game);
            // SecureNetworking controls the local SDR certificate path; it does
            // not provide a Valve VAC session. SKYNET's Dota dedicated servers
            // intentionally run with -insecure, so every Dota client must opt in
            // to insecure game-server connections even when SDR is enabled.
            var requiresInsecureClient = game.AppId == 570 || !game.Ini.SecureNetworking;
            var insecureArg = requiresInsecureClient &&
                !ContainsArgument(game.LaunchArguments, "-insecure") &&
                !ContainsArgument(extraArgs, "-insecure")
                    ? "-insecure"
                    : null;
            var unrealBootstrapProjectArg = ResolveUnrealBootstrapProjectArgument(game);
            var args = string.Join(" ",
                new[] { unrealBootstrapProjectArg, game.LaunchArguments, insecureArg, extraArgs }
                    .Where(a => !string.IsNullOrWhiteSpace(a)));

            WriteLaunchDiagnostic(
                $"launch exe={game.ExecutablePath} workingDirectory={workDir} " +
                $"staticImport={hasStaticSteamImport} delayImport={hasDelaySteamImport} " +
                $"bootstrapProjectArg={unrealBootstrapProjectArg ?? "<none>"} args={args}");

            // Unreal delay-load hooks may resolve the original Steam DLL by its
            // absolute plugin path before the regular delay helper runs. Load the
            // payload under a short private alias, then rewrite the shared module-name
            // string in the suspended image so both paths select the same module.
            var delayImportAlias = hasDelaySteamImport
                ? (arch == GameArch.X64 ? "skynet64.dll" : "skynet.dll")
                : null;
            var injectablePayload = PrepareInjectablePayload(payload, delayImportAlias);
            if (delayImportAlias != null)
            {
                stagedDelayAliases = StageDelayImportAliases(
                    workDir,
                    steamImportName,
                    delayImportAlias,
                    injectablePayload,
                    arch);
                WriteLaunchDiagnostic(
                    $"staged delay-import aliases: {string.Join("; ", stagedDelayAliases)}");
            }
            var stdoutLogPath = ContainsArgument(args, "-stdout")
                ? Path.Combine(ConfigStore.RootDir, "game-stdout.log")
                : null;
            var effectiveAppId = game.CompatibilityAppId != 0
                ? game.CompatibilityAppId
                : game.AppId;
            proc = DllInjector.LaunchAndInject(
                game.ExecutablePath,
                injectablePayload,
                args,
                workDir,
                hasStaticSteamImport && !hasDelaySteamImport ? steamImportName : null,
                hasDelaySteamImport ? steamImportName : null,
                stdoutLogPath,
                effectiveAppId);
            proc.EnableRaisingEvents = true;
            var processId = proc.Id;
            proc.Exited += (_, _) =>
            {
                CleanupDelayImportAliases(stagedDelayAliases);
                try
                {
                    WriteLaunchDiagnostic($"exit pid={processId} code={proc.ExitCode}");
                }
                catch (Exception ex)
                {
                    WriteLaunchDiagnostic($"exit pid={processId} code=<unavailable> error={ex.Message}");
                }

                GameExited?.Invoke(game);
            };
            WriteLaunchDiagnostic(
                $"started pid={processId} payload={injectablePayload}" +
                (stdoutLogPath == null ? string.Empty : $" stdout={stdoutLogPath}") +
                $" SteamAppId={effectiveAppId} SteamGameId={effectiveAppId}");
            GameWindowActivator.BringToFrontWhenReady(proc);
        }
        catch (Exception ex)
        {
            CleanupDelayImportAliases(stagedDelayAliases);
            return LaunchResult.Fail($"Failed to inject emulator into the game:\n{ex.Message}");
        }

        game.LastPlayedUtc = DateTimeOffset.UtcNow;
        return LaunchResult.Ok(proc, hasStaticSteamImport);
    }

    private static string ResolveWorkingDirectory(GameEntry game)
    {
        if (!string.IsNullOrWhiteSpace(game.WorkingDirectory))
        {
            var configured = Path.GetFullPath(game.WorkingDirectory);
            if (Directory.Exists(configured))
                return configured;
        }

        var exeFolder = game.ExeFolder;
        if (string.IsNullOrWhiteSpace(exeFolder))
            return Path.GetDirectoryName(game.ExecutablePath)!;

        // Unreal's root bootstrap executable normally starts
        // <Project>\Binaries\Win64\<Project>-Win64-Shipping.exe with the game
        // root as its current directory. When the Shipping executable is selected
        // directly for injection, preserve that launch environment.
        var platformDirectory = new DirectoryInfo(exeFolder);
        var binariesDirectory = platformDirectory.Parent;
        var projectDirectory = binariesDirectory?.Parent;
        var gameRoot = projectDirectory?.Parent;
        var isUnrealPlatformDirectory =
            string.Equals(platformDirectory.Name, "Win64", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(platformDirectory.Name, "Win32", StringComparison.OrdinalIgnoreCase);

        if (isUnrealPlatformDirectory &&
            string.Equals(binariesDirectory?.Name, "Binaries", StringComparison.OrdinalIgnoreCase) &&
            projectDirectory != null &&
            gameRoot != null &&
            File.Exists(Path.Combine(gameRoot.FullName, projectDirectory.Name + ".exe")))
        {
            return gameRoot.FullName;
        }

        return exeFolder;
    }

    private static string? ResolveUnrealBootstrapProjectArgument(GameEntry game)
    {
        var platformDirectory = new DirectoryInfo(game.ExeFolder);
        var binariesDirectory = platformDirectory.Parent;
        var projectDirectory = binariesDirectory?.Parent;
        var gameRoot = projectDirectory?.Parent;
        if (projectDirectory == null || gameRoot == null ||
            !string.Equals(binariesDirectory?.Name, "Binaries", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var platform = platformDirectory.Name;
        if (!string.Equals(platform, "Win64", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(platform, "Win32", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var expectedShippingName = $"{projectDirectory.Name}-{platform}-Shipping";
        if (!string.Equals(
                Path.GetFileNameWithoutExtension(game.ExecutablePath),
                expectedShippingName,
                StringComparison.OrdinalIgnoreCase) ||
            !File.Exists(Path.Combine(gameRoot.FullName, projectDirectory.Name + ".exe")))
        {
            return null;
        }

        // Unreal's packaged-game bootstrapper supplies the project name as argv[1].
        // A directly injected Shipping executable must receive the same token or it
        // can perform a clean early shutdown even after SteamAPI_Init succeeds.
        var projectArgument = projectDirectory.Name;
        if (ContainsArgument(game.LaunchArguments, projectArgument))
            return null;

        return projectArgument.Any(char.IsWhiteSpace)
            ? $"\"{projectArgument.Replace("\"", "\\\"")}\""
            : projectArgument;
    }

    private static void WriteLaunchDiagnostic(string message)
    {
        try
        {
            Directory.CreateDirectory(ConfigStore.RootDir);
            File.AppendAllText(
                Path.Combine(ConfigStore.RootDir, "launcher.log"),
                $"{DateTimeOffset.Now:HH:mm:ss.fff}  {message}{Environment.NewLine}");
        }
        catch
        {
        }
    }

    private static bool ContainsArgument(string? arguments, string expected)
    {
        if (string.IsNullOrWhiteSpace(arguments))
            return false;

        return arguments!
            .Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Any(argument => string.Equals(argument, expected, StringComparison.OrdinalIgnoreCase));
    }

    private static string PrepareInjectablePayload(string payload, string? shadowFileName = null)
    {
        var payloadBytes = File.ReadAllBytes(payload);
        var hash = ComputePayloadHash(payloadBytes);
        var shadowRoot = Path.Combine(Path.GetTempPath(), "SKYNETSteamClient", "payload-shadow");
        var shadowDir = Path.Combine(shadowRoot, hash);
        var payloadFileName = string.IsNullOrWhiteSpace(shadowFileName)
            ? Path.GetFileName(payload) ?? throw new InvalidOperationException("Payload file name is missing.")
            : shadowFileName!;
        var shadowPath = Path.Combine(shadowDir, payloadFileName);

        Directory.CreateDirectory(shadowDir);
        bool shadowMatches = false;
        try
        {
            shadowMatches = File.Exists(shadowPath) &&
                File.ReadAllBytes(shadowPath).SequenceEqual(payloadBytes);
        }
        catch
        {
            // A missing, unreadable, or partially replaced shadow must be rebuilt
            // from the payload shipped next to this launcher.
        }

        if (!shadowMatches)
        {
            File.WriteAllBytes(shadowPath, payloadBytes);
        }

        try
        {
            Directory.SetLastWriteTimeUtc(shadowDir, DateTime.UtcNow);
        }
        catch
        {
        }

        CleanupPayloadShadows(shadowRoot, hash, payloadFileName);
        return shadowPath;
    }

    private static string ComputePayloadHash(byte[] payloadBytes)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(payloadBytes);
        return BitConverter.ToString(hashBytes).Replace("-", string.Empty).ToLowerInvariant();
    }

    private static IReadOnlyList<string> StageDelayImportAliases(
        string searchRoot,
        string originalModuleName,
        string aliasModuleName,
        string payloadPath,
        GameArch targetArch)
    {
        var staged = new List<string>();
        try
        {
            var originalDlls = Directory
                .EnumerateFiles(searchRoot, originalModuleName, SearchOption.AllDirectories)
                .Where(path => PeArch.Detect(path) == targetArch)
                .ToArray();
            if (originalDlls.Length == 0)
                throw new FileNotFoundException(
                    $"No '{originalModuleName}' dependency was found below '{searchRoot}' for delay-load aliasing.");

            foreach (var originalDll in originalDlls)
            {
                var aliasPath = Path.Combine(Path.GetDirectoryName(originalDll)!, aliasModuleName);
                var markerPath = aliasPath + MarkerSuffix;
                if (File.Exists(aliasPath) && !File.Exists(markerPath))
                    throw new IOException($"Delay-load alias already exists and is not owned by SKYNET: {aliasPath}");

                TryRestore(aliasPath);
                File.WriteAllText(markerPath, Path.GetFileName(payloadPath));
                File.Copy(payloadPath, aliasPath, overwrite: false);
                staged.Add(aliasPath);
            }

            return staged;
        }
        catch
        {
            CleanupDelayImportAliases(staged);
            throw;
        }
    }

    private static void CleanupDelayImportAliases(IEnumerable<string> aliases)
    {
        foreach (var aliasPath in aliases)
        {
            TryRestore(aliasPath);
        }
    }

    private static void CleanupPayloadShadows(string shadowRoot, string activeHash, string payloadFileName)
    {
        try
        {
            if (!Directory.Exists(shadowRoot))
            {
                return;
            }

            var shadows = Directory.GetDirectories(shadowRoot)
                .Where(directory => File.Exists(Path.Combine(directory, payloadFileName)))
                .OrderByDescending(directory =>
                    string.Equals(Path.GetFileName(directory), activeHash, StringComparison.OrdinalIgnoreCase)
                        ? DateTime.MaxValue
                        : Directory.GetLastWriteTimeUtc(directory))
                .ToArray();

            foreach (var directory in shadows.Skip(PreviousPayloadShadowsToKeep + 1))
            {
                TryDeleteShadow(directory);
            }
        }
        catch
        {
        }
    }

    private static void TryDeleteShadow(string directory)
    {
        try
        {
            Directory.Delete(directory, recursive: true);
        }
        catch
        {
        }
    }

    /// <summary>Restores the original DLL and removes our footprint. Safe to call twice.</summary>
    private static void TryRestore(string targetDll)
    {
        try
        {
            var backup = targetDll + BackupSuffix;
            var marker = targetDll + MarkerSuffix;
            if (!File.Exists(marker) && !File.Exists(backup)) return;

            if (File.Exists(targetDll)) File.Delete(targetDll);
            var cfg = targetDll + ".config";
            if (File.Exists(cfg)) File.Delete(cfg);

            if (File.Exists(backup)) File.Move(backup, targetDll);
            if (File.Exists(marker)) File.Delete(marker);
        }
        catch { /* best-effort; recovered on next start */ }
    }

    /// <summary>
    /// Restores any DLLs left injected by a previous run that crashed before exit.
    /// Call on startup (no game of ours is running then, so files are unlocked).
    /// </summary>
    public void RecoverOrphans(IEnumerable<GameEntry> games)
    {
        foreach (var game in games)
        {
            if (string.IsNullOrWhiteSpace(game.ExeFolder)) continue;
            foreach (var name in new[] { "steam_api64.dll", "steam_api.dll" })
            {
                var target = Path.Combine(game.ExeFolder, name);
                if (File.Exists(target + MarkerSuffix) || File.Exists(target + BackupSuffix))
                    TryRestore(target);
            }

            try
            {
                var searchRoot = ResolveWorkingDirectory(game);
                foreach (var marker in Directory.EnumerateFiles(
                    searchRoot,
                    $"skynet*.dll{MarkerSuffix}",
                    SearchOption.AllDirectories))
                {
                    TryRestore(marker.Substring(0, marker.Length - MarkerSuffix.Length));
                }
            }
            catch
            {
            }
        }
    }
}
