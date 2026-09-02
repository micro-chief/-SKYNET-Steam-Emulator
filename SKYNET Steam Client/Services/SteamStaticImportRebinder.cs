using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using SKYNET.Client.Models;

namespace SKYNET.Client.Services;

/// <summary>
/// Rebinds a direct or delay-loaded Steam API import before the initial process thread runs.
/// Windows then resolves the import to the payload's absolute shadow path while
/// loading the image, so static consumers use the launcher payload without any
/// game-folder replacement or post-start loader race.
/// </summary>
internal static class SteamStaticImportRebinder
{
    private const uint MemCommitReserve = 0x3000;
    private const uint MemRelease = 0x8000;
    private const uint PageReadWrite = 0x04;

    // Temporary Bodycam launch diagnostic. Each guarded PreInit failure normally
    // returns 1, which hides the stage that rejected startup. Tagging the immediate
    // values in the suspended image makes the process exit code identify that stage
    // without changing the game executable on disk.
    private static readonly (uint Rva, int ExitCode)[] BodycamPreInitExitTags =
    {
        (0x040977D1, 0x71),
        (0x04097AFC, 0x72),
        (0x04097B82, 0x73),
        (0x04097E02, 0x74),
        (0x040988EA, 0x75),
        (0x04098D19, 0x76),
        (0x0409901D, 0x77),
        (0x0409905E, 0x78),
        (0x04099813, 0x79),
        (0x04099F2B, 0x7A),
        (0x0409A606, 0x7B)
    };

    public static void TagBodycamPreInitExitCodes(IntPtr processHandle, string executablePath)
    {
        if (PeArch.Detect(executablePath) != GameArch.X64)
            throw new InvalidOperationException("Bodycam PreInit diagnostics require the expected x64 executable.");

        var imageBase = ReadImageBase(processHandle, GameArch.X64);

        PatchBodycamLegacyShaderCachePath(processHandle, imageBase);

        foreach (var (rva, exitCode) in BodycamPreInitExitTags)
        {
            var instructionAddress = new IntPtr(checked(imageBase + rva));
            var current = new byte[5];
            if (!ReadProcessMemory(processHandle, instructionAddress, current, current.Length, out var read) ||
                read.ToInt64() != current.Length)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(),
                    $"ReadProcessMemory failed for Bodycam PreInit tag at RVA 0x{rva:X8}.");
            }

            if (current[0] != 0xBB || BitConverter.ToInt32(current, 1) != 1)
            {
                throw new InvalidOperationException(
                    $"Bodycam executable does not match the diagnostic layout at RVA 0x{rva:X8}.");
            }

            WriteProtectedBytes(
                processHandle,
                new IntPtr(checked(instructionAddress.ToInt64() + 1)),
                BitConverter.GetBytes(exitCode),
                $"Bodycam PreInit exit tag 0x{exitCode:X2}");
        }
    }

    public static void StartBodycamPatchPersistenceMonitor(
        IntPtr processHandle,
        uint mainThreadId,
        string executablePath,
        string logPath)
    {
        if (PeArch.Detect(executablePath) != GameArch.X64)
            throw new InvalidOperationException("Bodycam patch persistence monitoring requires the expected x64 executable.");

        var imageBase = ReadImageBase(processHandle, GameArch.X64);
        var textSection = ReadTextSectionRange(executablePath);
        var currentProcess = GetCurrentProcess();
        if (!DuplicateHandle(
                currentProcess,
                processHandle,
                currentProcess,
                out var monitorHandle,
                0,
                false,
                DuplicateSameAccess))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(),
                "DuplicateHandle failed for Bodycam patch persistence monitoring.");
        }

        var initialState = CaptureBodycamPatchState(monitorHandle, imageBase);
        var logDirectory = Path.GetDirectoryName(logPath);
        if (!string.IsNullOrWhiteSpace(logDirectory))
            Directory.CreateDirectory(logDirectory);
        File.WriteAllText(
            logPath,
            $"{DateTimeOffset.Now:O} phase=before-resume imageBase=0x{imageBase:X16} {initialState}{Environment.NewLine}");

        _ = Task.Run(() =>
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var previousState = initialState;
            var exitRequestCaptured = false;
            var checkpoints = new[] { 25L, 50L, 100L, 250L, 500L, 1000L, 1500L, 2500L, 4000L };
            var checkpointIndex = 0;
            try
            {
                while (stopwatch.ElapsedMilliseconds <= 5000)
                {
                    if (WaitForSingleObject(monitorHandle, 0) == WaitObject0)
                    {
                        AppendBodycamPatchLog(logPath, stopwatch.ElapsedMilliseconds, "process-exited", previousState);
                        return;
                    }

                    if (!exitRequestCaptured &&
                        ReadProcessBytes(
                            monitorHandle,
                            new IntPtr(checked(imageBase + BodycamExitRequestedRva)),
                            1,
                            "Bodycam exit-request flag monitor")[0] != 0)
                    {
                        exitRequestCaptured = true;
                        var trace = CaptureBodycamMainThreadTrace(
                            monitorHandle,
                            mainThreadId,
                            imageBase,
                            textSection.Rva,
                            textSection.Size);
                        AppendBodycamPatchLog(logPath, stopwatch.ElapsedMilliseconds, "exit-requested", trace);
                    }

                    var state = CaptureBodycamPatchState(monitorHandle, imageBase);
                    if (!string.Equals(state, previousState, StringComparison.Ordinal))
                    {
                        AppendBodycamPatchLog(logPath, stopwatch.ElapsedMilliseconds, "bytes-changed", state);
                        previousState = state;
                    }

                    while (checkpointIndex < checkpoints.Length &&
                           stopwatch.ElapsedMilliseconds >= checkpoints[checkpointIndex])
                    {
                        AppendBodycamPatchLog(
                            logPath,
                            stopwatch.ElapsedMilliseconds,
                            $"checkpoint-{checkpoints[checkpointIndex]}ms",
                            state);
                        checkpointIndex++;
                    }

                    Thread.SpinWait(250);
                }

                AppendBodycamPatchLog(logPath, stopwatch.ElapsedMilliseconds, "monitor-complete", previousState);
            }
            catch (Exception ex)
            {
                AppendBodycamPatchLog(logPath, stopwatch.ElapsedMilliseconds, "monitor-error", ex.Message);
            }
            finally
            {
                CloseHandle(monitorHandle);
            }
        });
    }

    private static string CaptureBodycamMainThreadTrace(
        IntPtr processHandle,
        uint mainThreadId,
        long imageBase,
        uint textRva,
        uint textSize)
    {
        var threadHandle = OpenThread(
            ThreadSuspendResume | ThreadGetContext | ThreadQueryInformation,
            false,
            mainThreadId);
        if (threadHandle == IntPtr.Zero)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenThread failed for Bodycam exit trace.");

        var suspended = false;
        IntPtr rawContext = IntPtr.Zero;
        try
        {
            if (SuspendThread(threadHandle) == uint.MaxValue)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "SuspendThread failed for Bodycam exit trace.");
            suspended = true;

            rawContext = Marshal.AllocHGlobal(ContextAmd64Size + 16);
            var alignedContext = new IntPtr((rawContext.ToInt64() + 15) & ~15L);
            for (var offset = 0; offset < ContextAmd64Size; offset += sizeof(int))
                Marshal.WriteInt32(alignedContext, offset, 0);
            Marshal.WriteInt32(alignedContext, ContextFlagsOffset, unchecked((int)ContextAmd64ControlInteger));
            if (!GetThreadContext(threadHandle, alignedContext))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetThreadContext failed for Bodycam exit trace.");

            var rsp = Marshal.ReadInt64(alignedContext, ContextRspOffset);
            var rip = Marshal.ReadInt64(alignedContext, ContextRipOffset);
            var stack = new byte[32 * 1024];
            ReadProcessMemory(processHandle, new IntPtr(rsp), stack, stack.Length, out var bytesRead);
            var readableBytes = checked((int)Math.Max(0, Math.Min(stack.Length, bytesRead.ToInt64())));

            var textStart = checked(imageBase + textRva);
            var textEnd = checked(textStart + textSize);
            var candidates = new List<string>();
            for (var offset = 0; offset + sizeof(long) <= readableBytes && candidates.Count < 64; offset += sizeof(long))
            {
                var address = BitConverter.ToInt64(stack, offset);
                if (address < textStart || address >= textEnd)
                    continue;
                candidates.Add($"+0x{offset:X4}:RVA0x{address - imageBase:X8}");
            }

            var ripRva = rip >= imageBase ? rip - imageBase : -1;
            return
                $"thread={mainThreadId} rip=0x{rip:X16} ripRva=0x{ripRva:X8} rsp=0x{rsp:X16} " +
                $"stackBytes={readableBytes} bodycamTextReturns=[{string.Join(",", candidates)}]";
        }
        finally
        {
            if (rawContext != IntPtr.Zero)
                Marshal.FreeHGlobal(rawContext);
            if (suspended)
                ResumeThread(threadHandle);
            CloseHandle(threadHandle);
        }
    }

    private static (uint Rva, uint Size) ReadTextSectionRange(string executablePath)
    {
        using var stream = File.OpenRead(executablePath);
        using var reader = new BinaryReader(stream);
        stream.Position = 0x3C;
        var peOffset = reader.ReadUInt32();
        stream.Position = peOffset + 6;
        var sectionCount = reader.ReadUInt16();
        stream.Position = peOffset + 20;
        var optionalHeaderSize = reader.ReadUInt16();
        stream.Position = peOffset + 24 + optionalHeaderSize;

        for (var index = 0; index < sectionCount; index++)
        {
            var name = Encoding.ASCII.GetString(reader.ReadBytes(8)).TrimEnd('\0');
            var virtualSize = reader.ReadUInt32();
            var virtualAddress = reader.ReadUInt32();
            var rawSize = reader.ReadUInt32();
            stream.Position += 20;
            if (string.Equals(name, ".text", StringComparison.Ordinal))
                return (virtualAddress, Math.Max(virtualSize, rawSize));
        }

        throw new InvalidDataException("Bodycam executable has no .text section.");
    }

    private static string CaptureBodycamPatchState(IntPtr processHandle, long imageBase)
    {
        const uint platformNameLeaRva = 0x00E8AB84;
        const uint prefixLengthRva = 0x00E8ABFD;
        const uint prefixLeaRva = 0x00E8AC03;

        var platformLeaAddress = new IntPtr(checked(imageBase + platformNameLeaRva));
        var prefixLengthAddress = new IntPtr(checked(imageBase + prefixLengthRva));
        var prefixLeaAddress = new IntPtr(checked(imageBase + prefixLeaRva));
        var platformLea = ReadProcessBytes(processHandle, platformLeaAddress, 7, "Bodycam platform-name LEA monitor");
        var prefixLength = ReadProcessBytes(processHandle, prefixLengthAddress, 6, "Bodycam prefix-length monitor");
        var prefixLea = ReadProcessBytes(processHandle, prefixLeaAddress, 7, "Bodycam prefix LEA monitor");

        var platformTarget = ResolveRipRelativeLeaTarget(platformLeaAddress, platformLea);
        var prefixTarget = ResolveRipRelativeLeaTarget(prefixLeaAddress, prefixLea);
        var platformText = platformTarget == 0
            ? Array.Empty<byte>()
            : ReadProcessBytes(processHandle, new IntPtr(platformTarget), 11, "Bodycam platform-name text monitor");

        return
            $"platformLea={BitConverter.ToString(platformLea)} " +
            $"platformTarget=0x{platformTarget:X16} platformText={Encoding.ASCII.GetString(platformText).TrimEnd('\0')} " +
            $"prefixLength={BitConverter.ToString(prefixLength)} " +
            $"prefixLea={BitConverter.ToString(prefixLea)} prefixTarget=0x{prefixTarget:X16}";
    }

    private static long ResolveRipRelativeLeaTarget(IntPtr instructionAddress, byte[] instruction)
    {
        if (instruction.Length != 7 || instruction[0] != 0x48 || instruction[1] != 0x8D || instruction[2] != 0x15)
            return 0;

        return checked(instructionAddress.ToInt64() + 7 + BitConverter.ToInt32(instruction, 3));
    }

    private static void AppendBodycamPatchLog(string logPath, long elapsedMilliseconds, string phase, string state)
    {
        File.AppendAllText(
            logPath,
            $"{DateTimeOffset.Now:O} elapsedMs={elapsedMilliseconds} phase={phase} {state}{Environment.NewLine}");
    }

    private static void PatchBodycamLegacyShaderCachePath(IntPtr processHandle, long imageBase)
    {
        // This build initializes a legacy path as
        //   ../../../Engine/GlobalShaderCache-SP_Windows.bin
        // before the shader-platform-aware GetGlobalShaderCacheFilename routine is
        // called. The depot instead contains GlobalShaderCache-PCD3D_SM6.bin. Keep
        // the generated path the same length by replacing both source components:
        // "GlobalShaderCache-SP_" + "Windows" becomes
        // "GlobalShaderCache-" + "PCD3D_SM6". Only the suspended process is
        // modified; the executable and packaged content remain untouched.
        const uint platformNameLeaRva = 0x00E8AB84;
        const uint prefixLengthRva = 0x00E8ABFD;
        const uint prefixLeaRva = 0x00E8AC03;
        const uint windowsStringRva = 0x070ABA18;
        const uint legacyPrefixRva = 0x07AEB7A8;
        const uint shaderCachePrefixRva = 0x07AF2568;

        var platformNameLeaAddress = new IntPtr(checked(imageBase + platformNameLeaRva));
        var prefixLengthAddress = new IntPtr(checked(imageBase + prefixLengthRva));
        var prefixLeaAddress = new IntPtr(checked(imageBase + prefixLeaRva));

        ValidateRipRelativeLea(
            processHandle,
            platformNameLeaAddress,
            checked(imageBase + windowsStringRva),
            "Bodycam legacy platform-name source");
        ValidateProcessBytes(
            processHandle,
            prefixLengthAddress,
            new byte[] { 0x41, 0xB8, 0x15, 0x00, 0x00, 0x00 },
            "Bodycam legacy shader-cache prefix length");
        ValidateRipRelativeLea(
            processHandle,
            prefixLeaAddress,
            checked(imageBase + legacyPrefixRva),
            "Bodycam legacy shader-cache prefix source");

        var shaderPlatformBytes = Encoding.ASCII.GetBytes("PCD3D_SM6\0");
        var remoteShaderPlatform = AllocateWithinImageRva(processHandle, imageBase, shaderPlatformBytes.Length);
        WriteBytes(processHandle, remoteShaderPlatform, shaderPlatformBytes, "Bodycam PCD3D_SM6 platform name");

        WriteProtectedBytes(
            processHandle,
            platformNameLeaAddress,
            BuildRipRelativeLea(platformNameLeaAddress, remoteShaderPlatform),
            "Bodycam PCD3D_SM6 platform-name source");
        WriteProtectedBytes(
            processHandle,
            prefixLengthAddress,
            new byte[] { 0x41, 0xB8, 0x12, 0x00, 0x00, 0x00 },
            "Bodycam shader-cache prefix length");
        WriteProtectedBytes(
            processHandle,
            prefixLeaAddress,
            BuildRipRelativeLea(prefixLeaAddress, new IntPtr(checked(imageBase + shaderCachePrefixRva))),
            "Bodycam shader-cache prefix source");
    }

    private static void ValidateRipRelativeLea(
        IntPtr processHandle,
        IntPtr instructionAddress,
        long expectedTarget,
        string operation)
    {
        var current = ReadProcessBytes(processHandle, instructionAddress, 7, operation);
        if (current[0] != 0x48 || current[1] != 0x8D || current[2] != 0x15)
            throw new InvalidOperationException($"{operation} is not the expected RIP-relative LEA instruction.");

        var actualTarget = checked(instructionAddress.ToInt64() + 7 + BitConverter.ToInt32(current, 3));
        if (actualTarget != expectedTarget)
            throw new InvalidOperationException($"{operation} does not reference the expected executable data.");
    }

    private static byte[] BuildRipRelativeLea(IntPtr instructionAddress, IntPtr targetAddress)
    {
        var displacement = checked((int)(targetAddress.ToInt64() - instructionAddress.ToInt64() - 7));
        var bytes = new byte[] { 0x48, 0x8D, 0x15, 0, 0, 0, 0 };
        BitConverter.GetBytes(displacement).CopyTo(bytes, 3);
        return bytes;
    }

    private static void ValidateProcessBytes(
        IntPtr processHandle,
        IntPtr address,
        byte[] expected,
        string operation)
    {
        var current = ReadProcessBytes(processHandle, address, expected.Length, operation);
        if (!current.SequenceEqual(expected))
            throw new InvalidOperationException($"{operation} does not match the expected executable layout.");
    }

    private static byte[] ReadProcessBytes(
        IntPtr processHandle,
        IntPtr address,
        int byteCount,
        string operation)
    {
        var bytes = new byte[byteCount];
        if (!ReadProcessMemory(processHandle, address, bytes, bytes.Length, out var read) ||
            read.ToInt64() != bytes.Length)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), $"ReadProcessMemory failed for {operation}.");
        }

        return bytes;
    }

    public static void Rebind(
        IntPtr processHandle,
        string executablePath,
        string payloadPath,
        string importedModuleName)
    {
        var nameFieldRvas = PeImports.FindImportNameFieldRvas(executablePath, importedModuleName);
        if (nameFieldRvas.Count == 0)
            throw new InvalidOperationException($"No direct or delay-loaded import of '{importedModuleName}' was found in '{executablePath}'.");

        var imageBase = ReadImageBase(processHandle, PeArch.Detect(executablePath));
        var pathBytes = Encoding.ASCII.GetBytes(Path.GetFullPath(payloadPath) + "\0");
        var remotePath = AllocateWithinImageRva(processHandle, imageBase, pathBytes.Length);
        try
        {
            WriteBytes(processHandle, remotePath, pathBytes, "payload import path");
            var pathRva = checked((uint)(remotePath.ToInt64() - imageBase));
            var pathRvaBytes = BitConverter.GetBytes(pathRva);
            foreach (var nameFieldRva in nameFieldRvas)
            {
                var nameFieldAddress = new IntPtr(checked(imageBase + nameFieldRva));
                WriteProtectedBytes(processHandle, nameFieldAddress, pathRvaBytes, "import descriptor");
            }
        }
        catch
        {
            VirtualFreeEx(processHandle, remotePath, UIntPtr.Zero, MemRelease);
            throw;
        }
    }

    /// <summary>
    /// Rewrites the delay-import module-name string in the suspended image. Unreal's
    /// delay-load preload hook may reference that same pooled string directly, so
    /// changing only the descriptor pointer is insufficient for plugins such as
    /// SteamCorePro that otherwise resolve their bundled DLL by an absolute path.
    /// The replacement module is injected first under its alias and is therefore
    /// returned by both the preload hook and the normal delay-load helper.
    /// </summary>
    public static void RebindDelayModuleName(
        IntPtr processHandle,
        string executablePath,
        string importedModuleName,
        string replacementModuleName)
    {
        var nameRvas = PeImports.FindDelayImportNameRvas(executablePath, importedModuleName);
        if (nameRvas.Count == 0)
            throw new InvalidOperationException($"No delay-loaded import of '{importedModuleName}' was found in '{executablePath}'.");

        var originalBytes = Encoding.ASCII.GetBytes(importedModuleName + "\0");
        var replacementBytes = Encoding.ASCII.GetBytes(replacementModuleName + "\0");
        if (replacementBytes.Length > originalBytes.Length)
            throw new InvalidOperationException($"Delay-import alias '{replacementModuleName}' is longer than '{importedModuleName}'.");

        var paddedReplacement = new byte[originalBytes.Length];
        Buffer.BlockCopy(replacementBytes, 0, paddedReplacement, 0, replacementBytes.Length);
        var imageBase = ReadImageBase(processHandle, PeArch.Detect(executablePath));
        foreach (var nameRva in nameRvas)
        {
            var nameAddress = new IntPtr(checked(imageBase + nameRva));
            WriteProtectedBytes(processHandle, nameAddress, paddedReplacement, "delay-import module name");
        }

        RebindSteamCoreModuleStem(
            processHandle,
            executablePath,
            imageBase,
            importedModuleName,
            replacementModuleName);
    }

    private static void RebindSteamCoreModuleStem(
        IntPtr processHandle,
        string executablePath,
        long imageBase,
        string importedModuleName,
        string replacementModuleName)
    {
        var importedStem = Path.GetFileNameWithoutExtension(importedModuleName);
        var replacementStem = Path.GetFileNameWithoutExtension(replacementModuleName);
        if (importedStem.EndsWith("64", StringComparison.OrdinalIgnoreCase))
            importedStem = importedStem.Substring(0, importedStem.Length - 2);
        if (replacementStem.EndsWith("64", StringComparison.OrdinalIgnoreCase))
            replacementStem = replacementStem.Substring(0, replacementStem.Length - 2);
        if (string.IsNullOrEmpty(importedStem) || string.IsNullOrEmpty(replacementStem))
            return;

        var originalBytes = Encoding.ASCII.GetBytes(importedStem + "\0");
        var replacementBytes = Encoding.ASCII.GetBytes(replacementStem + "\0");
        if (replacementBytes.Length > originalBytes.Length)
            return;

        var paddedReplacement = new byte[originalBytes.Length];
        Buffer.BlockCopy(replacementBytes, 0, paddedReplacement, 0, replacementBytes.Length);
        foreach (var stemRva in PeImports.FindAsciiStringRvas(executablePath, importedStem))
        {
            var stemAddress = new IntPtr(checked(imageBase + stemRva));
            WriteProtectedBytes(processHandle, stemAddress, paddedReplacement, "SteamCore module stem");
        }
    }

    private static IntPtr AllocateWithinImageRva(IntPtr processHandle, long imageBase, int byteCount)
    {
        // IMAGE_IMPORT_DESCRIPTOR stores an RVA as uint32. Requesting memory above
        // the image makes the rebinding valid for both PE32 and PE32+ images.
        const long InitialOffset = 0x01000000;
        const long RetryStride = 0x01000000;
        for (var attempt = 0; attempt < 64; attempt++)
        {
            var hint = new IntPtr(checked(imageBase + InitialOffset + RetryStride * attempt));
            var allocation = VirtualAllocEx(processHandle, hint, (UIntPtr)byteCount, MemCommitReserve, PageReadWrite);
            if (allocation == IntPtr.Zero)
                continue;

            var rva = allocation.ToInt64() - imageBase;
            if (rva >= 0 && rva <= uint.MaxValue)
                return allocation;

            VirtualFreeEx(processHandle, allocation, UIntPtr.Zero, MemRelease);
        }

        throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not allocate a valid RVA for the static Steam API import.");
    }

    private static long ReadImageBase(IntPtr processHandle, GameArch targetArch)
    {
        IntPtr pebAddress;
        if (targetArch == GameArch.X86 && IntPtr.Size == 8)
        {
            var status = NtQueryInformationProcess(processHandle, ProcessWow64Information, out pebAddress, IntPtr.Size, out _);
            if (status != 0 || pebAddress == IntPtr.Zero)
                throw new InvalidOperationException($"NtQueryInformationProcess(ProcessWow64Information) failed with status 0x{status:X8}.");
        }
        else
        {
            var status = NtQueryInformationProcess(
                processHandle,
                ProcessBasicInformation,
                out ProcessBasicInformationResult basic,
                Marshal.SizeOf<ProcessBasicInformationResult>(),
                out _);
            if (status != 0 || basic.PebBaseAddress == IntPtr.Zero)
                throw new InvalidOperationException($"NtQueryInformationProcess(ProcessBasicInformation) failed with status 0x{status:X8}.");
            pebAddress = basic.PebBaseAddress;
        }

        var pointerSize = targetArch == GameArch.X86 ? 4 : 8;
        var imageBaseField = new IntPtr(checked(pebAddress.ToInt64() + (pointerSize == 8 ? 0x10 : 0x08)));
        var bytes = new byte[pointerSize];
        if (!ReadProcessMemory(processHandle, imageBaseField, bytes, bytes.Length, out var read) || read.ToInt64() != bytes.Length)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "ReadProcessMemory failed while reading the target image base from its PEB.");

        return pointerSize == 8 ? BitConverter.ToInt64(bytes, 0) : BitConverter.ToUInt32(bytes, 0);
    }

    private static void WriteProtectedBytes(IntPtr processHandle, IntPtr address, byte[] bytes, string operation)
    {
        if (!VirtualProtectEx(processHandle, address, (UIntPtr)bytes.Length, PageReadWrite, out var previousProtect))
            throw new Win32Exception(Marshal.GetLastWin32Error(), $"VirtualProtectEx failed for {operation}.");

        try
        {
            WriteBytes(processHandle, address, bytes, operation);
            if (!FlushInstructionCache(processHandle, address, (UIntPtr)bytes.Length))
                throw new Win32Exception(Marshal.GetLastWin32Error(), $"FlushInstructionCache failed for {operation}.");
        }
        finally
        {
            VirtualProtectEx(processHandle, address, (UIntPtr)bytes.Length, previousProtect, out _);
        }
    }

    private static void WriteBytes(IntPtr processHandle, IntPtr address, byte[] bytes, string operation)
    {
        if (!WriteProcessMemory(processHandle, address, bytes, bytes.Length, out var written) || written.ToInt64() != bytes.Length)
            throw new Win32Exception(Marshal.GetLastWin32Error(), $"WriteProcessMemory failed for {operation}.");
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr VirtualAllocEx(IntPtr hProcess, IntPtr lpAddress, UIntPtr dwSize, uint flAllocationType, uint flProtect);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool VirtualFreeEx(IntPtr hProcess, IntPtr lpAddress, UIntPtr dwSize, uint dwFreeType);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool VirtualProtectEx(IntPtr hProcess, IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool WriteProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int nSize, out IntPtr lpNumberOfBytesWritten);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FlushInstructionCache(IntPtr hProcess, IntPtr lpBaseAddress, UIntPtr dwSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int nSize, out IntPtr lpNumberOfBytesRead);

    private const uint DuplicateSameAccess = 0x00000002;
    private const uint WaitObject0 = 0x00000000;
    private const uint BodycamExitRequestedRva = 0x091647BA;
    private const uint ThreadSuspendResume = 0x0002;
    private const uint ThreadGetContext = 0x0008;
    private const uint ThreadQueryInformation = 0x0040;
    private const int ContextAmd64Size = 1232;
    private const int ContextFlagsOffset = 0x30;
    private const int ContextRspOffset = 0x98;
    private const int ContextRipOffset = 0xF8;
    private const uint ContextAmd64ControlInteger = 0x00100003;

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetCurrentProcess();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool DuplicateHandle(
        IntPtr hSourceProcessHandle,
        IntPtr hSourceHandle,
        IntPtr hTargetProcessHandle,
        out IntPtr lpTargetHandle,
        uint dwDesiredAccess,
        bool bInheritHandle,
        uint dwOptions);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenThread(uint dwDesiredAccess, bool bInheritHandle, uint dwThreadId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint SuspendThread(IntPtr hThread);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr hThread);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetThreadContext(IntPtr hThread, IntPtr lpContext);

    private const int ProcessBasicInformation = 0;
    private const int ProcessWow64Information = 26;

    [DllImport("ntdll.dll")]
    private static extern int NtQueryInformationProcess(
        IntPtr processHandle,
        int processInformationClass,
        out ProcessBasicInformationResult processInformation,
        int processInformationLength,
        out int returnLength);

    [DllImport("ntdll.dll")]
    private static extern int NtQueryInformationProcess(
        IntPtr processHandle,
        int processInformationClass,
        out IntPtr processInformation,
        int processInformationLength,
        out int returnLength);

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessBasicInformationResult
    {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2_0;
        public IntPtr Reserved2_1;
        public IntPtr UniqueProcessId;
        public IntPtr Reserved3;
    }
}
