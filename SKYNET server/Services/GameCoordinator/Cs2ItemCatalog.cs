using System.Globalization;
using System.Text.RegularExpressions;

namespace SKYNET_server.Services;

public sealed record Cs2InventoryCatalogAttribute(uint DefIndex, uint ValueBits);

public sealed record Cs2InventoryCatalogItem(
    uint DefIndex,
    uint PaintKitBits,
    uint PaintSeedBits,
    uint PaintWearBits,
    uint Quality,
    uint Rarity,
    string WeaponName,
    string PaintName,
    string Category,
    IReadOnlyList<Cs2InventoryCatalogAttribute> Attributes);

public sealed record Cs2ItemCatalogSnapshot(
    ulong Version,
    uint ClientVersion,
    string GamePath,
    string SourcePath,
    IReadOnlyList<Cs2InventoryCatalogItem> Items)
{
    public static readonly Cs2ItemCatalogSnapshot Empty = new(
        1,
        0,
        string.Empty,
        string.Empty,
        Array.Empty<Cs2InventoryCatalogItem>());
}

/// <summary>
/// Builds local CS2 inventory instances from the game's own economy schema.
/// Paint-to-weapon associations are read from the loot-list keys embedded in
/// items_game.txt, so impossible paint/weapon cross-products are not created.
/// </summary>
internal static class Cs2ItemCatalog
{
    private const string ItemsGameEntry = "scripts/items/items_game.txt";
    // Increment whenever the serialized CSOEconItem layout changes. Keeping
    // this in the SO version forces clients to discard a previously accepted
    // cache instead of retaining items encoded with an older wire format.
    private const ulong InventoryWireRevision = 3;

    private const uint StickerDefIndex = 1209;
    private const uint PatchDefIndex = 4609;
    private const uint MusicKitDefIndex = 1314;
    private const uint GraffitiDefIndex = 1349;
    private const uint KeychainDefIndex = 1355;

    private const uint PaintKitAttribute = 6;
    private const uint PaintSeedAttribute = 7;
    private const uint PaintWearAttribute = 8;
    private const uint StickerKitAttribute = 113;
    private const uint MusicIdAttribute = 166;
    private const uint SpraysRemainingAttribute = 232;
    private const uint SprayTintAttribute = 233;
    private const uint KeychainIdAttribute = 299;

    private static readonly HashSet<uint> GenericKnifePaintKits = new()
    {
        12, 27, 38, 40, 42, 43, 44, 59, 72, 77, 98, 143, 175, 323,
        409, 410, 411, 413, 414, 415, 416, 417, 418, 419, 420, 421,
        568, 569, 570, 571, 572, 578, 579, 580, 581, 582, 617, 618, 619
    };

    private static readonly Regex AssociationRegex = new(
        "\"\\[(?<paint>[^\\]]+)\\](?<weapon>weapon_[^\"]+)\"\\s+\"(?:1|[0-9.]+)\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex RarityRegex = new(
        "\"(?<paint>[^\"]+)\"\\s+\"(?<rarity>common|uncommon|rare|mythical|legendary|ancient|immortal)\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private static readonly IReadOnlyDictionary<string, uint> RarityIds =
        new Dictionary<string, uint>(StringComparer.OrdinalIgnoreCase)
        {
            ["common"] = 1,
            ["uncommon"] = 2,
            ["rare"] = 3,
            ["mythical"] = 4,
            ["legendary"] = 5,
            ["ancient"] = 6,
            ["immortal"] = 7
        };

    public static Cs2ItemCatalogSnapshot Import(string? requestedPath)
    {
        var gamePath = ResolveGamePath(requestedPath);
        var pakPath = ResolvePakPath(gamePath);
        var itemsGame = ValveVpkReader.ReadText(pakPath, ItemsGameEntry);
        var items = Parse(itemsGame);
        if (items.Count == 0)
        {
            throw new InvalidDataException("CS2 items_game.txt did not produce any paint/weapon inventory pairs.");
        }

        var clientVersion = TryReadClientVersion(gamePath, out var detectedVersion)
            ? detectedVersion
            : 0;
        var modified = File.GetLastWriteTimeUtc(pakPath);
        var unixMilliseconds = Math.Max(1L, new DateTimeOffset(modified).ToUnixTimeMilliseconds());
        var version = (unchecked((ulong)unixMilliseconds) << 20) |
                      (InventoryWireRevision << 16) |
                      unchecked((uint)items.Count & 0xFFFFU);
        return new Cs2ItemCatalogSnapshot(version, clientVersion, gamePath, pakPath, items);
    }

    public static IReadOnlyList<Cs2InventoryCatalogItem> Parse(string itemsGame)
    {
        if (string.IsNullOrWhiteSpace(itemsGame))
        {
            return Array.Empty<Cs2InventoryCatalogItem>();
        }

        var associations = AssociationRegex.Matches(itemsGame)
            .Select(match => new PaintWeaponPair(
                match.Groups["paint"].Value,
                match.Groups["weapon"].Value))
            .Distinct()
            .ToList();
        var wantedPaints = associations.Select(pair => pair.PaintName).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var wantedWeapons = associations.Select(pair => pair.WeaponName).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var itemDefinitions = new Dictionary<uint, ItemDefinition>();
        var weapons = new Dictionary<string, uint>(StringComparer.OrdinalIgnoreCase);
        foreach (var section in EnumerateSectionBodies(itemsGame, "items"))
        {
            foreach (var child in EnumerateObjectChildren(itemsGame, section))
            {
                if (!uint.TryParse(child.Key, NumberStyles.None, CultureInfo.InvariantCulture, out var defIndex))
                {
                    continue;
                }

                var name = FindDirectField(child.Value, "name");
                itemDefinitions[defIndex] = new ItemDefinition(
                    defIndex,
                    name,
                    FindDirectField(child.Value, "prefab"),
                    FindDirectField(child.Value, "item_rarity"));
                if (wantedWeapons.Contains(name))
                {
                    weapons.TryAdd(name, defIndex);
                }
            }
        }

        var paints = new Dictionary<string, PaintDefinition>(StringComparer.OrdinalIgnoreCase);
        foreach (var section in EnumerateSectionBodies(itemsGame, "paint_kits"))
        {
            foreach (var child in EnumerateObjectChildren(itemsGame, section))
            {
                if (!uint.TryParse(child.Key, NumberStyles.None, CultureInfo.InvariantCulture, out var paintKit) || paintKit == 0)
                {
                    continue;
                }

                var name = FindDirectField(child.Value, "name");
                if (name.Length == 0)
                {
                    continue;
                }

                var seed = ParseFloat(FindDirectField(child.Value, "seed"), float.NaN);
                var wearMin = ParseFloat(FindDirectField(child.Value, "wear_remap_min"), 0.06F);
                var wearMax = ParseFloat(FindDirectField(child.Value, "wear_remap_max"), 0.80F);
                var wear = ParseFloat(FindDirectField(child.Value, "wear_default"), float.NaN);
                if (float.IsNaN(wear))
                {
                    wear = Math.Clamp(0.10F, wearMin, wearMax);
                }

                paints.TryAdd(name, new PaintDefinition(paintKit, name, seed, wear));
            }
        }

        var rarities = new Dictionary<string, uint>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in RarityRegex.Matches(itemsGame))
        {
            var name = match.Groups["paint"].Value;
            if (wantedPaints.Contains(name) && RarityIds.TryGetValue(match.Groups["rarity"].Value, out var rarity))
            {
                rarities[name] = rarity;
            }
        }

        var result = new List<Cs2InventoryCatalogItem>(associations.Count + 1024);
        foreach (var pair in associations.OrderBy(pair => pair.WeaponName).ThenBy(pair => pair.PaintName))
        {
            if (!weapons.TryGetValue(pair.WeaponName, out var defIndex) ||
                !paints.TryGetValue(pair.PaintName, out var paint))
            {
                continue;
            }

            var seed = float.IsNaN(paint.Seed)
                ? (float)((paint.PaintKit * 31U + defIndex) % 1000U)
                : paint.Seed;
            var rarity = rarities.GetValueOrDefault(pair.PaintName, 1U);
            result.Add(new Cs2InventoryCatalogItem(
                defIndex,
                BitConverter.SingleToUInt32Bits(paint.PaintKit),
                BitConverter.SingleToUInt32Bits(seed),
                BitConverter.SingleToUInt32Bits(paint.Wear),
                4,
                rarity,
                pair.WeaponName,
                pair.PaintName,
                "weapon",
                PaintAttributes(paint.PaintKit, seed, paint.Wear)));
        }

        var weaponItems = result
            .DistinctBy(item => (item.DefIndex, item.PaintKitBits))
            .OrderBy(item => item.DefIndex)
            .ThenBy(item => item.PaintKitBits)
            .ToList();

        result.Clear();
        result.AddRange(weaponItems);
        AddKnives(result, itemDefinitions.Values, paints.Values);
        AddAgents(result, itemDefinitions.Values);
        AddStickerAndGraffiti(result, itemsGame);
        AddKeychains(result, itemsGame);
        AddMusicKits(result, itemsGame);
        AddPatches(result, itemsGame);
        AddGloves(result, itemDefinitions.Values, paints.Values);
        AddCasesAndKeys(result, itemDefinitions.Values);
        return result;
    }

    public static bool RunSelfCheck(Action<string>? write = null)
    {
        const string fixture = """
            "items"
            {
                "7" { "name" "weapon_ak47" "prefab" "weapon_ak47_prefab" }
                "9" { "name" "weapon_awp" "prefab" "weapon_awp_prefab" }
                "500" { "name" "weapon_bayonet" "prefab" "melee_unusual" }
                "4619" { "name" "customplayer_ctm_st6_variantj" "prefab" "customplayertradable" "item_rarity" "legendary" }
                "5030" { "name" "sporty_gloves" "prefab" "hands_paintable" }
                "4001" { "name" "fixture_case" "prefab" "weapon_case" }
                "4002" { "name" "fixture_key" "prefab" "weapon_case_key" }
                "4003" { "name" "fixture_souvenir" "prefab" "weapon_case_souvenirpkg" }
                "4004" { "name" "crate_sticker_pack_fixture" "prefab" "sticker_capsule" }
                "4005" { "name" "crate_graffiti_pack_fixture" "prefab" "graffiti_box" }
                "4006" { "name" "fixture_trophy" "prefab" "majors_trophy" }
                "4007" { "name" "fixture_service_medal" "prefab" "prestige_coin" }
            }
            "paint_kits"
            {
                "38" { "name" "aa_fade" "wear_remap_min" "0.00" "wear_remap_max" "0.08" }
                "10018" { "name" "sporty_light_blue" "wear_remap_min" "0.06" "wear_remap_max" "0.80" }
                "801" { "name" "cu_ak47_asiimov" "wear_remap_min" "0.05" "wear_remap_max" "0.70" }
                "344" { "name" "cu_awp_hyper_beast" "seed" "12" "wear_default" "0.20" }
            }
            "client_loot_lists"
            {
                "fixture" { "[cu_ak47_asiimov]weapon_ak47" "1" "[cu_awp_hyper_beast]weapon_awp" "1" }
            }
            "paint_kits_rarity"
            {
                "cu_ak47_asiimov" "legendary"
                "cu_awp_hyper_beast" "mythical"
            }
            "sticker_kits"
            {
                "10" { "name" "fixture_sticker" "sticker_material" "fixture/sticker" "item_rarity" "rare" }
                "11" { "name" "fixture_patch" "patch_material" "fixture/patch" "item_rarity" "mythical" }
                "1697" { "name" "spray_fixture" "sticker_material" "fixture/spray" "item_rarity" "uncommon" }
            }
            "keychain_definitions"
            {
                "3" { "name" "fixture_keychain" "item_rarity" "mythical" }
            }
            "music_definitions"
            {
                "2" { "name" "fixture_music" }
            }
            """;

        var parsed = Parse(fixture);
        var ak = parsed.SingleOrDefault(item => item.DefIndex == 7);
        var awp = parsed.SingleOrDefault(item => item.DefIndex == 9);
        var knife = parsed.SingleOrDefault(item => item.Category == "knife" && item.PaintName == "aa_fade");
        var agent = parsed.SingleOrDefault(item => item.Category == "agent");
        var sticker = parsed.SingleOrDefault(item => item.Category == "sticker");
        var graffiti = parsed.SingleOrDefault(item => item.Category == "graffiti");
        var keychain = parsed.SingleOrDefault(item => item.Category == "keychain");
        var music = parsed.SingleOrDefault(item => item.Category == "music");
        var patch = parsed.SingleOrDefault(item => item.Category == "patch");
        var glove = parsed.SingleOrDefault(item => item.Category == "glove" && item.PaintName == "sporty_light_blue");
        var crate = parsed.SingleOrDefault(item => item.Category == "case");
        var crateKey = parsed.SingleOrDefault(item => item.Category == "case_key");
        var souvenir = parsed.SingleOrDefault(item => item.Category == "souvenir_case");
        var stickerCapsule = parsed.SingleOrDefault(item => item.Category == "sticker_capsule");
        var graffitiBox = parsed.SingleOrDefault(item => item.Category == "graffiti_box");
        var trophy = parsed.SingleOrDefault(item => item.DefIndex == 4006 && item.Category == "trophy");
        var serviceMedal = parsed.SingleOrDefault(item => item.DefIndex == 4007 && item.Category == "trophy");
        var ok = parsed.Count == 19 &&
                 ak is not null && BitConverter.UInt32BitsToSingle(ak.PaintKitBits) == 801F && ak.Rarity == 5 &&
                 awp is not null && BitConverter.UInt32BitsToSingle(awp.PaintSeedBits) == 12F && awp.Rarity == 4 &&
                 knife?.Attributes.Any(value => value.DefIndex == PaintKitAttribute &&
                     BitConverter.UInt32BitsToSingle(value.ValueBits) == 38F) == true &&
                 agent?.DefIndex == 4619 && sticker?.Attributes.Single().ValueBits == 10 &&
                 graffiti?.Attributes.Any(value => value.DefIndex == SpraysRemainingAttribute) == true &&
                 keychain?.Attributes.Single().ValueBits == 3 && music?.Attributes.Single().ValueBits == 2 &&
                 patch?.Attributes.Single().ValueBits == 11 && glove?.DefIndex == 5030 &&
                 crate?.DefIndex == 4001 && crateKey?.DefIndex == 4002 && souvenir?.DefIndex == 4003 &&
                 stickerCapsule?.DefIndex == 4004 && graffitiBox?.DefIndex == 4005 && trophy?.DefIndex == 4006 &&
                 serviceMedal?.DefIndex == 4007;
        write?.Invoke(
            $"CS2 catalog parser -> items={parsed.Count}, weapons={parsed.Count(item => item.Category == "weapon")}, " +
            $"knives={parsed.Count(item => item.Category == "knife")}, agents={parsed.Count(item => item.Category == "agent")}, " +
            $"stickers={parsed.Count(item => item.Category == "sticker")}, graffiti={parsed.Count(item => item.Category == "graffiti")}, " +
            $"keychains={parsed.Count(item => item.Category == "keychain")}, music={parsed.Count(item => item.Category == "music")}, " +
            $"patches={parsed.Count(item => item.Category == "patch")}, gloves={parsed.Count(item => item.Category == "glove")}, " +
            $"cases={parsed.Count(item => item.Category == "case")}, keys={parsed.Count(item => item.Category == "case_key")}, " +
            $"souvenirs={parsed.Count(item => item.Category == "souvenir_case")}, " +
            $"capsules={parsed.Count(item => item.Category == "sticker_capsule")}, " +
            $"graffitiBoxes={parsed.Count(item => item.Category == "graffiti_box")}, " +
            $"trophies={parsed.Count(item => item.Category == "trophy")}, ok={ok}");
        return ok;
    }

    private static string ResolveGamePath(string? requestedPath)
    {
        var candidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(requestedPath))
        {
            candidates.Add(requestedPath.Trim().Trim('"'));
        }

        var programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        if (!string.IsNullOrWhiteSpace(programFilesX86))
        {
            candidates.Add(Path.Combine(programFilesX86, "Steam", "steamapps", "common", "Counter-Strike Global Offensive"));
        }

        candidates.Add(@"D:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive");
        foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            string fullPath;
            try
            {
                fullPath = Path.GetFullPath(candidate);
            }
            catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
            {
                continue;
            }

            if (TryResolvePakPath(fullPath, out _))
            {
                return NormalizeGameRoot(fullPath);
            }
        }

        throw new FileNotFoundException("CS2 pak01_dir.vpk was not found. Configure GameCoordinator:Cs2:Inventory:GamePath.");
    }

    private static string NormalizeGameRoot(string path)
    {
        var normalized = path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (string.Equals(Path.GetFileName(normalized), "csgo", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(Path.GetFileName(Path.GetDirectoryName(normalized)), "game", StringComparison.OrdinalIgnoreCase))
        {
            return Path.GetFullPath(Path.Combine(normalized, "..", ".."));
        }

        if (string.Equals(Path.GetFileName(normalized), "game", StringComparison.OrdinalIgnoreCase))
        {
            return Path.GetFullPath(Path.Combine(normalized, ".."));
        }

        return normalized;
    }

    private static string ResolvePakPath(string gamePath)
    {
        if (TryResolvePakPath(gamePath, out var pakPath))
        {
            return pakPath;
        }

        throw new FileNotFoundException("CS2 game\\csgo\\pak01_dir.vpk was not found.", Path.Combine(gamePath, "game", "csgo", "pak01_dir.vpk"));
    }

    private static bool TryResolvePakPath(string path, out string pakPath)
    {
        var candidates = new[]
        {
            Path.Combine(path, "game", "csgo", "pak01_dir.vpk"),
            Path.Combine(path, "csgo", "pak01_dir.vpk"),
            Path.Combine(path, "pak01_dir.vpk")
        };
        pakPath = candidates.FirstOrDefault(File.Exists) ?? string.Empty;
        return pakPath.Length > 0;
    }

    private static bool TryReadClientVersion(string gamePath, out uint version)
    {
        version = 0;
        var candidates = new[]
        {
            Path.Combine(gamePath, "game", "csgo", "steam.inf"),
            Path.Combine(gamePath, "csgo", "steam.inf"),
            Path.Combine(gamePath, "steam.inf")
        };
        var steamInfPath = candidates.FirstOrDefault(File.Exists);
        if (steamInfPath == null)
        {
            return false;
        }

        foreach (var line in File.ReadLines(steamInfPath))
        {
            var separator = line.IndexOf('=');
            if (separator <= 0 || !string.Equals(line[..separator].Trim(), "ClientVersion", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return uint.TryParse(line[(separator + 1)..].Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out version) && version > 0;
        }

        return false;
    }

    private static IEnumerable<int> EnumerateSectionBodies(string text, string sectionName)
    {
        var token = $"\"{sectionName}\"";
        var searchFrom = 0;
        while (searchFrom < text.Length)
        {
            var sectionIndex = text.IndexOf(token, searchFrom, StringComparison.OrdinalIgnoreCase);
            if (sectionIndex < 0)
            {
                yield break;
            }

            var index = sectionIndex + token.Length;
            SkipTrivia(text, ref index);
            searchFrom = index;
            if (index < text.Length && text[index] == '{')
            {
                yield return index + 1;
                var end = FindMatchingBrace(text, index);
                searchFrom = end > index ? end + 1 : index + 1;
            }
        }
    }

    private static IEnumerable<KeyValuePair<string, string>> EnumerateObjectChildren(string text, int bodyStart)
    {
        var index = bodyStart;
        while (index < text.Length)
        {
            SkipTrivia(text, ref index);
            if (index >= text.Length || text[index] == '}')
            {
                yield break;
            }

            var key = ReadToken(text, ref index);
            if (key.Length == 0)
            {
                yield break;
            }

            SkipTrivia(text, ref index);
            if (index >= text.Length)
            {
                yield break;
            }

            if (text[index] != '{')
            {
                _ = ReadToken(text, ref index);
                continue;
            }

            var blockStart = index;
            var blockEnd = FindMatchingBrace(text, blockStart);
            if (blockEnd <= blockStart)
            {
                yield break;
            }

            yield return new KeyValuePair<string, string>(key, text.Substring(blockStart, blockEnd - blockStart + 1));
            index = blockEnd + 1;
        }
    }

    private static string FindDirectField(string block, string wantedField)
    {
        var index = block.Length > 0 && block[0] == '{' ? 1 : 0;
        while (index < block.Length)
        {
            SkipTrivia(block, ref index);
            if (index >= block.Length || block[index] == '}')
            {
                return string.Empty;
            }

            var key = ReadToken(block, ref index);
            SkipTrivia(block, ref index);
            if (index >= block.Length)
            {
                return string.Empty;
            }

            if (block[index] == '{')
            {
                var end = FindMatchingBrace(block, index);
                index = end > index ? end + 1 : block.Length;
                continue;
            }

            var value = ReadToken(block, ref index);
            if (string.Equals(key, wantedField, StringComparison.OrdinalIgnoreCase))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static int FindMatchingBrace(string text, int openBrace)
    {
        var depth = 0;
        var inString = false;
        for (var index = openBrace; index < text.Length; index++)
        {
            var value = text[index];
            if (value == '"' && (index == 0 || text[index - 1] != '\\'))
            {
                inString = !inString;
                continue;
            }

            if (inString)
            {
                continue;
            }

            if (value == '{')
            {
                depth++;
            }
            else if (value == '}' && --depth == 0)
            {
                return index;
            }
        }

        return -1;
    }

    private static void SkipTrivia(string text, ref int index)
    {
        while (index < text.Length)
        {
            if (char.IsWhiteSpace(text[index]))
            {
                index++;
                continue;
            }

            if (index + 1 < text.Length && text[index] == '/' && text[index + 1] == '/')
            {
                index += 2;
                while (index < text.Length && text[index] != '\n')
                {
                    index++;
                }

                continue;
            }

            break;
        }
    }

    private static string ReadToken(string text, ref int index)
    {
        SkipTrivia(text, ref index);
        if (index >= text.Length)
        {
            return string.Empty;
        }

        if (text[index] == '"')
        {
            index++;
            var start = index;
            while (index < text.Length && !(text[index] == '"' && text[index - 1] != '\\'))
            {
                index++;
            }

            var result = text.Substring(start, Math.Max(0, index - start));
            if (index < text.Length)
            {
                index++;
            }

            return result;
        }

        var tokenStart = index;
        while (index < text.Length && !char.IsWhiteSpace(text[index]) && text[index] is not ('{' or '}'))
        {
            index++;
        }

        return text.Substring(tokenStart, index - tokenStart);
    }

    private static float ParseFloat(string value, float fallback)
    {
        return float.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : fallback;
    }

    private static void AddKnives(
        ICollection<Cs2InventoryCatalogItem> result,
        IEnumerable<ItemDefinition> itemDefinitions,
        IEnumerable<PaintDefinition> paintDefinitions)
    {
        var knives = itemDefinitions
            .Where(item => string.Equals(item.Prefab, "melee_unusual", StringComparison.OrdinalIgnoreCase))
            .Where(item => item.Name.StartsWith("weapon_", StringComparison.OrdinalIgnoreCase))
            .OrderBy(item => item.DefIndex)
            .ToDictionary(item => item.DefIndex);
        foreach (var knife in knives.Values)
        {
            result.Add(new Cs2InventoryCatalogItem(
                knife.DefIndex, 0, 0, 0, 3, 6, knife.Name, "vanilla", "knife",
                Array.Empty<Cs2InventoryCatalogAttribute>()));
        }

        foreach (var paint in paintDefinitions.OrderBy(value => value.PaintKit))
        {
            foreach (var defIndex in ResolveKnifeTargets(paint, knives.Keys))
            {
                if (!knives.TryGetValue(defIndex, out var knife))
                {
                    continue;
                }

                var seed = float.IsNaN(paint.Seed)
                    ? (float)((paint.PaintKit * 31U + defIndex) % 1000U)
                    : paint.Seed;
                result.Add(new Cs2InventoryCatalogItem(
                    defIndex,
                    BitConverter.SingleToUInt32Bits(paint.PaintKit),
                    BitConverter.SingleToUInt32Bits(seed),
                    BitConverter.SingleToUInt32Bits(paint.Wear),
                    3,
                    6,
                    knife.Name,
                    paint.Name,
                    "knife",
                    PaintAttributes(paint.PaintKit, seed, paint.Wear)));
            }
        }
    }

    private static IEnumerable<uint> ResolveKnifeTargets(PaintDefinition paint, IEnumerable<uint> allKnifeDefIndexes)
    {
        if (GenericKnifePaintKits.Contains(paint.PaintKit))
        {
            return allKnifeDefIndexes;
        }

        var name = paint.Name;
        uint target = name switch
        {
            _ when ContainsAlias(name, "m9_bay") => 508,
            _ when ContainsAlias(name, "bayonet") => 500,
            _ when ContainsAlias(name, "flip") => 505,
            _ when ContainsAlias(name, "gut") => 506,
            _ when ContainsAlias(name, "karam") => 507,
            _ when ContainsAlias(name, "huntsman") => 509,
            _ when ContainsAlias(name, "falchion") => 512,
            _ when ContainsAlias(name, "bowie") => 514,
            _ when ContainsAlias(name, "butterfly") => 515,
            _ when ContainsAlias(name, "push") => 516,
            _ when ContainsAlias(name, "cord") => 517,
            _ when ContainsAlias(name, "canis") => 518,
            _ when ContainsAlias(name, "ursus") => 519,
            _ when ContainsAlias(name, "gypsy") || ContainsAlias(name, "navaja") => 520,
            _ when ContainsAlias(name, "outdoor") || ContainsAlias(name, "nomad") => 521,
            _ when ContainsAlias(name, "stiletto") => 522,
            _ when ContainsAlias(name, "widow") || ContainsAlias(name, "talon") => 523,
            _ when ContainsAlias(name, "skeleton") => 525,
            _ when ContainsAlias(name, "kukri") => 526,
            _ when ContainsAlias(name, "classic_knife") || ContainsAlias(name, "css") => 503,
            _ => 0
        };
        return target == 0 ? Array.Empty<uint>() : new[] { target };
    }

    private static bool ContainsAlias(string value, string alias)
    {
        return value.Contains($"_{alias}_", StringComparison.OrdinalIgnoreCase) ||
               value.EndsWith($"_{alias}", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith($"{alias}_", StringComparison.OrdinalIgnoreCase);
    }

    private static void AddAgents(ICollection<Cs2InventoryCatalogItem> result, IEnumerable<ItemDefinition> definitions)
    {
        foreach (var item in definitions
                     .Where(value => string.Equals(value.Prefab, "customplayertradable", StringComparison.OrdinalIgnoreCase))
                     .OrderBy(value => value.DefIndex))
        {
            result.Add(new Cs2InventoryCatalogItem(
                item.DefIndex, 0, 0, 0, 4, RarityId(item.Rarity, 3), item.Name, string.Empty, "agent",
                Array.Empty<Cs2InventoryCatalogAttribute>()));
        }
    }

    private static void AddStickerAndGraffiti(ICollection<Cs2InventoryCatalogItem> result, string itemsGame)
    {
        var stickers = new Dictionary<uint, KitDefinition>();
        var graffiti = new Dictionary<uint, KitDefinition>();
        foreach (var section in EnumerateSectionBodies(itemsGame, "sticker_kits"))
        {
            foreach (var child in EnumerateObjectChildren(itemsGame, section))
            {
                if (!uint.TryParse(child.Key, NumberStyles.None, CultureInfo.InvariantCulture, out var kitId) || kitId == 0)
                {
                    continue;
                }

                var name = FindDirectField(child.Value, "name");
                var stickerMaterial = FindDirectField(child.Value, "sticker_material");
                if (name.StartsWith("spray_", StringComparison.OrdinalIgnoreCase))
                {
                    graffiti[kitId] = new KitDefinition(kitId, name, FindDirectField(child.Value, "item_rarity"));
                }
                else if (stickerMaterial.Length > 0 && FindDirectField(child.Value, "patch_material").Length == 0)
                {
                    stickers[kitId] = new KitDefinition(kitId, name, FindDirectField(child.Value, "item_rarity"));
                }
            }
        }

        foreach (var kit in stickers.Values.OrderBy(value => value.Id))
        {
            result.Add(new Cs2InventoryCatalogItem(
                StickerDefIndex, 0, 0, 0, 4, RarityId(kit.Rarity), "sticker", kit.Name, "sticker",
                new[] { new Cs2InventoryCatalogAttribute(StickerKitAttribute, kit.Id) }));
        }

        foreach (var kit in graffiti.Values.OrderBy(value => value.Id))
        {
            result.Add(new Cs2InventoryCatalogItem(
                GraffitiDefIndex, 0, 0, 0, 4, RarityId(kit.Rarity), "spraypaint", kit.Name, "graffiti",
                new[]
                {
                    new Cs2InventoryCatalogAttribute(StickerKitAttribute, kit.Id),
                    new Cs2InventoryCatalogAttribute(SpraysRemainingAttribute, 50),
                    new Cs2InventoryCatalogAttribute(SprayTintAttribute, 1U + kit.Id % 18U)
                }));
        }
    }

    private static void AddKeychains(ICollection<Cs2InventoryCatalogItem> result, string itemsGame)
    {
        foreach (var kit in ReadKits(itemsGame, "keychain_definitions").Values.OrderBy(value => value.Id))
        {
            result.Add(new Cs2InventoryCatalogItem(
                KeychainDefIndex, 0, 0, 0, 4, RarityId(kit.Rarity), "keychain", kit.Name, "keychain",
                new[] { new Cs2InventoryCatalogAttribute(KeychainIdAttribute, kit.Id) }));
        }
    }

    private static void AddMusicKits(ICollection<Cs2InventoryCatalogItem> result, string itemsGame)
    {
        foreach (var kit in ReadKits(itemsGame, "music_definitions").Values.OrderBy(value => value.Id))
        {
            result.Add(new Cs2InventoryCatalogItem(
                MusicKitDefIndex, 0, 0, 0, 4, RarityId(kit.Rarity, 3), "musickit", kit.Name, "music",
                new[] { new Cs2InventoryCatalogAttribute(MusicIdAttribute, kit.Id) }));
        }
    }

    private static void AddPatches(ICollection<Cs2InventoryCatalogItem> result, string itemsGame)
    {
        var patches = new Dictionary<uint, KitDefinition>();
        foreach (var section in EnumerateSectionBodies(itemsGame, "sticker_kits"))
        {
            foreach (var child in EnumerateObjectChildren(itemsGame, section))
            {
                if (!uint.TryParse(child.Key, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || id == 0 ||
                    FindDirectField(child.Value, "patch_material").Length == 0)
                {
                    continue;
                }

                patches[id] = new KitDefinition(
                    id,
                    FindDirectField(child.Value, "name"),
                    FindDirectField(child.Value, "item_rarity"));
            }
        }

        foreach (var patch in patches.Values.OrderBy(value => value.Id))
        {
            result.Add(new Cs2InventoryCatalogItem(
                PatchDefIndex, 0, 0, 0, 4, RarityId(patch.Rarity), "patch", patch.Name, "patch",
                new[] { new Cs2InventoryCatalogAttribute(StickerKitAttribute, patch.Id) }));
        }
    }

    private static void AddGloves(
        ICollection<Cs2InventoryCatalogItem> result,
        IEnumerable<ItemDefinition> itemDefinitions,
        IEnumerable<PaintDefinition> paintDefinitions)
    {
        var gloves = itemDefinitions
            .Where(item => string.Equals(item.Prefab, "hands_paintable", StringComparison.OrdinalIgnoreCase))
            .OrderBy(item => item.DefIndex)
            .ToDictionary(item => item.DefIndex);
        foreach (var glove in gloves.Values)
        {
            result.Add(new Cs2InventoryCatalogItem(
                glove.DefIndex, 0, 0, 0, 4, 6, glove.Name, "vanilla", "glove",
                Array.Empty<Cs2InventoryCatalogAttribute>()));
        }

        foreach (var paint in paintDefinitions.Where(value => value.PaintKit >= 10000).OrderBy(value => value.PaintKit))
        {
            var defIndex = ResolveGloveDefIndex(paint.Name);
            if (defIndex == 0 || !gloves.TryGetValue(defIndex, out var glove))
            {
                continue;
            }

            var seed = float.IsNaN(paint.Seed)
                ? (float)((paint.PaintKit * 31U + defIndex) % 1000U)
                : paint.Seed;
            result.Add(new Cs2InventoryCatalogItem(
                defIndex,
                BitConverter.SingleToUInt32Bits(paint.PaintKit),
                BitConverter.SingleToUInt32Bits(seed),
                BitConverter.SingleToUInt32Bits(paint.Wear),
                4,
                6,
                glove.Name,
                paint.Name,
                "glove",
                PaintAttributes(paint.PaintKit, seed, paint.Wear)));
        }
    }

    private static uint ResolveGloveDefIndex(string paintName)
    {
        if (paintName.StartsWith("operation10_", StringComparison.OrdinalIgnoreCase))
        {
            return 4725;
        }

        if (paintName.StartsWith("bloodhound_hydra_", StringComparison.OrdinalIgnoreCase))
        {
            return 5035;
        }

        if (paintName.StartsWith("bloodhound_", StringComparison.OrdinalIgnoreCase))
        {
            return 5027;
        }

        if (paintName.StartsWith("sporty_", StringComparison.OrdinalIgnoreCase))
        {
            return 5030;
        }

        if (paintName.StartsWith("slick_", StringComparison.OrdinalIgnoreCase))
        {
            return 5031;
        }

        if (paintName.StartsWith("handwrap_", StringComparison.OrdinalIgnoreCase))
        {
            return 5032;
        }

        if (paintName.StartsWith("motorcycle_", StringComparison.OrdinalIgnoreCase))
        {
            return 5033;
        }

        return paintName.StartsWith("specialist_", StringComparison.OrdinalIgnoreCase) ? 5034U : 0U;
    }

    private static void AddCasesAndKeys(
        ICollection<Cs2InventoryCatalogItem> result,
        IEnumerable<ItemDefinition> itemDefinitions)
    {
        foreach (var item in itemDefinitions.OrderBy(value => value.DefIndex))
        {
            var category = ResolveContainerCategory(item);
            if (category.Length == 0)
            {
                continue;
            }

            result.Add(new Cs2InventoryCatalogItem(
                item.DefIndex, 0, 0, 0, 4, RarityId(item.Rarity), item.Name, string.Empty, category,
                Array.Empty<Cs2InventoryCatalogAttribute>()));
        }
    }

    private static string ResolveContainerCategory(ItemDefinition item)
    {
        var prefab = item.Prefab;
        var name = item.Name;
        if (prefab.Contains("weapon_case_key", StringComparison.OrdinalIgnoreCase))
        {
            return "case_key";
        }

        if (prefab.Contains("trophy", StringComparison.OrdinalIgnoreCase))
        {
            return "trophy";
        }

        if (prefab.Contains("coin", StringComparison.OrdinalIgnoreCase) ||
            prefab.Contains("collectible", StringComparison.OrdinalIgnoreCase) ||
            prefab.Contains("_pin", StringComparison.OrdinalIgnoreCase) ||
            prefab.StartsWith("pin", StringComparison.OrdinalIgnoreCase))
        {
            return "trophy";
        }

        if (prefab.Contains("souvenir", StringComparison.OrdinalIgnoreCase) &&
            (prefab.Contains("case", StringComparison.OrdinalIgnoreCase) ||
             prefab.Contains("crate", StringComparison.OrdinalIgnoreCase) ||
             name.Contains("souvenir", StringComparison.OrdinalIgnoreCase)))
        {
            return "souvenir_case";
        }

        if (prefab.Contains("graffiti_box", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("graffiti_pack", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("sprays_", StringComparison.OrdinalIgnoreCase))
        {
            return "graffiti_box";
        }

        if (prefab.Contains("sticker_capsule", StringComparison.OrdinalIgnoreCase) ||
            prefab.Contains("signature_capsule", StringComparison.OrdinalIgnoreCase) ||
            prefab.Contains("patch_capsule", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("sticker_pack", StringComparison.OrdinalIgnoreCase))
        {
            return "sticker_capsule";
        }

        if (prefab.Contains("weapon_case", StringComparison.OrdinalIgnoreCase) ||
            prefab.Contains("selfopening_collection", StringComparison.OrdinalIgnoreCase))
        {
            return "case";
        }

        return string.Empty;
    }

    private static Dictionary<uint, KitDefinition> ReadKits(string itemsGame, string sectionName)
    {
        var result = new Dictionary<uint, KitDefinition>();
        foreach (var section in EnumerateSectionBodies(itemsGame, sectionName))
        {
            foreach (var child in EnumerateObjectChildren(itemsGame, section))
            {
                if (!uint.TryParse(child.Key, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || id == 0)
                {
                    continue;
                }

                result[id] = new KitDefinition(
                    id,
                    FindDirectField(child.Value, "name"),
                    FindDirectField(child.Value, "item_rarity"));
            }
        }

        return result;
    }

    private static IReadOnlyList<Cs2InventoryCatalogAttribute> PaintAttributes(uint paintKit, float seed, float wear)
    {
        return new[]
        {
            new Cs2InventoryCatalogAttribute(PaintKitAttribute, BitConverter.SingleToUInt32Bits(paintKit)),
            new Cs2InventoryCatalogAttribute(PaintSeedAttribute, BitConverter.SingleToUInt32Bits(seed)),
            new Cs2InventoryCatalogAttribute(PaintWearAttribute, BitConverter.SingleToUInt32Bits(wear))
        };
    }

    private static uint RarityId(string value, uint fallback = 1)
    {
        return RarityIds.TryGetValue(value, out var rarity) ? rarity : fallback;
    }

    private sealed record PaintWeaponPair(string PaintName, string WeaponName);
    private sealed record PaintDefinition(uint PaintKit, string Name, float Seed, float Wear);
    private sealed record ItemDefinition(uint DefIndex, string Name, string Prefab, string Rarity);
    private sealed record KitDefinition(uint Id, string Name, string Rarity);
}
