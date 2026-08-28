using System.Net;
using SKYNET_server.Persistence;

namespace SKYNET_server.Services;

public sealed record Cs2LanReservation(
    ulong ServerId,
    ulong MatchId,
    ulong ReservationId,
    uint DirectUdpIp,
    uint DirectUdpPort,
    string ServerAddress,
    string Map);

public sealed record Cs2GameServerRegistration(
    ulong ServerId,
    ulong SessionSteamId,
    string ServerAddress,
    uint Port,
    uint Version,
    uint RegisteredAt);

/// <summary>
/// Small host boundary for AppID 730. The first implementation targets an
/// already-running LAN dedicated server; process supervision can be added
/// behind this boundary without changing the GC wire protocol.
/// </summary>
public static class Cs2GcRuntimeServices
{
    public const uint AppId = 730;
    public const string HostServiceName = "cs2";

    private static long _reservationSequence = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    private static readonly object ServerSync = new();

    public static bool Enabled { get; private set; } = true;
    public static string Address { get; private set; } = "127.0.0.1";
    public static uint Port { get; private set; } = 27015;
    public static string Map { get; private set; } = "de_dust2";
    public static ulong ServerId { get; private set; } = 85568392920027015UL;
    public static Cs2InventoryStore? InventoryStore { get; private set; }
    public static Cs2MatchStore? MatchStore { get; private set; }
    public static Cs2GameServerRegistration? RegisteredGameServer { get; private set; }
    public static Cs2ItemCatalogSnapshot ItemCatalog { get; private set; } = Cs2ItemCatalogSnapshot.Empty;
    public static string ItemCatalogStatus { get; private set; } = "Not initialized.";

    public static void Configure(IConfiguration configuration, string? contentRootPath = null)
    {
        var section = configuration.GetSection("GameCoordinator:Cs2:Lan");
        Enabled = section.GetValue("Enabled", true);
        Address = NormalizeAddress(
            section["Address"],
            configuration["Server:AdvertisedIp"]);
        Port = section.GetValue<uint?>("Port") ?? 27015;
        Map = string.IsNullOrWhiteSpace(section["Map"]) ? "de_dust2" : section["Map"]!.Trim();
        ServerId = section.GetValue<ulong?>("ServerSteamId") ?? (85568392920000000UL + Port);
        RegisteredGameServer = null;

        var dataRoot = DatabaseSplitMigrator.ResolveDataRoot(
            contentRootPath ?? Directory.GetCurrentDirectory(),
            configuration);
        var databasePath = Path.Combine(dataRoot, "cs2.db");
        InventoryStore = new Cs2InventoryStore(databasePath);
        MatchStore = new Cs2MatchStore(databasePath);

        var inventorySection = configuration.GetSection("GameCoordinator:Cs2:Inventory");
        if (inventorySection.GetValue("AutoImport", true))
        {
            try
            {
                ItemCatalog = Cs2ItemCatalog.Import(inventorySection["GamePath"]);
                ItemCatalogStatus = $"OK: {ItemCatalog.Items.Count} items from {ItemCatalog.SourcePath}";
            }
            catch (Exception ex) when (ex is IOException or InvalidDataException or UnauthorizedAccessException)
            {
                ItemCatalog = Cs2ItemCatalogSnapshot.Empty;
                ItemCatalogStatus = $"ERROR: {ex.Message}";
            }
        }
        else
        {
            ItemCatalog = Cs2ItemCatalogSnapshot.Empty;
            ItemCatalogStatus = "Automatic import disabled.";
        }
    }

    public static void UseInventoryStore(Cs2InventoryStore store)
    {
        InventoryStore = store ?? throw new ArgumentNullException(nameof(store));
    }

    public static void UseMatchStore(Cs2MatchStore store)
    {
        MatchStore = store ?? throw new ArgumentNullException(nameof(store));
    }

    public static void UseItemCatalog(Cs2ItemCatalogSnapshot catalog)
    {
        ItemCatalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
        ItemCatalogStatus = $"Injected: {catalog.Items.Count} items.";
    }

    public static Cs2EquipmentSnapshot GetEquipment(ulong steamId)
    {
        return InventoryStore?.Get(steamId) ?? new Cs2EquipmentSnapshot(
            1,
            Array.Empty<Cs2EquipmentBinding>(),
            Array.Empty<Cs2InventoryPosition>(),
            Array.Empty<Cs2ItemAttributeOverride>(),
            Array.Empty<Cs2InventoryInstance>());
    }

    public static ulong SetEquipment(ulong steamId, uint classId, uint slotId, ulong itemId)
    {
        return InventoryStore?.Set(steamId, classId, slotId, itemId) ?? 1;
    }

    public static ulong SetItemPosition(ulong steamId, ulong itemId, uint position)
    {
        return InventoryStore?.SetPosition(steamId, itemId, position) ?? 1;
    }

    public static ulong SetItemAttribute(ulong steamId, ulong itemId, uint defIndex, uint valueBits)
    {
        return InventoryStore?.SetAttribute(steamId, itemId, defIndex, valueBits) ?? 1;
    }

    public static ulong SetItemFloatAttribute(ulong steamId, ulong itemId, uint defIndex, float value)
    {
        return SetItemAttribute(steamId, itemId, defIndex, BitConverter.SingleToUInt32Bits(value));
    }

    public static ulong CreateRandomInventoryItem(ulong steamId, string rewardCategory)
    {
        var store = InventoryStore;
        if (store == null || ItemCatalog.Items.Count == 0)
        {
            return 0;
        }

        var categories = rewardCategory switch
        {
            "case_reward" => new HashSet<string>(StringComparer.Ordinal) { "weapon", "knife", "glove" },
            _ => new HashSet<string>(StringComparer.Ordinal) { rewardCategory }
        };
        var candidates = ItemCatalog.Items
            .Select((item, index) => (Item: item, Index: index))
            .Where(entry => categories.Contains(entry.Item.Category))
            .ToArray();
        if (candidates.Length == 0)
        {
            return 0;
        }

        var selected = candidates[Random.Shared.Next(candidates.Length)];
        var attributes = new List<Cs2ItemAttributeOverride>();
        if (selected.Item.Attributes.Any(attribute => attribute.DefIndex == 6))
        {
            var seed = Random.Shared.Next(1, 1001);
            var wear = 0.01f + (float)Random.Shared.NextDouble() * 0.74f;
            attributes.Add(new Cs2ItemAttributeOverride(
                0,
                7,
                BitConverter.SingleToUInt32Bits(seed)));
            attributes.Add(new Cs2ItemAttributeOverride(
                0,
                8,
                BitConverter.SingleToUInt32Bits(wear)));
        }

        return store.CreateItem(steamId, selected.Index, attributes).ItemId;
    }

    public static bool ActivateLanReservation(
        Cs2LanReservation reservation,
        uint gameType,
        uint serverVersion,
        IReadOnlyCollection<uint> accountIds,
        uint initiatingAccountId = 0,
        ulong initiatingSteamId = 0)
    {
        return MatchStore?.Activate(
            reservation,
            gameType,
            serverVersion,
            accountIds,
            initiatingAccountId,
            initiatingSteamId) ?? false;
    }

    public static Cs2ActiveReservation? GetOngoingReservation(uint accountId, ulong steamId = 0)
    {
        if (steamId != 0)
        {
            MatchStore?.BindSession(accountId, steamId);
        }

        return MatchStore?.GetForAccount(accountId);
    }

    public static bool ConfirmReservation(ulong reservationId, ulong serverId)
    {
        return MatchStore?.Confirm(reservationId, serverId) ?? false;
    }

    public static bool ClearReservation(uint accountId)
    {
        return MatchStore?.ClearForAccount(accountId) ?? false;
    }

    public static Cs2FinishedReservation? FinishReservation(ulong reservationId, ulong serverId)
    {
        return MatchStore?.Finish(reservationId, serverId);
    }

    public static Cs2LanReservation? CreateLanReservation(uint gameType, uint clientVersion)
    {
        if (!Enabled)
        {
            return null;
        }

        var sequence = unchecked((ulong)Interlocked.Increment(ref _reservationSequence));
        var unix = unchecked((ulong)DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        var matchId = 0x0A00000000000000UL | ((unix & 0xFFFFFFFFUL) << 20) | (sequence & 0xFFFFFUL);
        var reservationId = 0x0B00000000000000UL | ((unix & 0xFFFFFFFFUL) << 20) | (sequence & 0xFFFFFUL);
        var address = FormatEndpoint(Address, Port);

        ulong serverId;
        lock (ServerSync)
        {
            serverId = RegisteredGameServer?.ServerId ?? ServerId;
        }

        return new Cs2LanReservation(
            serverId,
            matchId,
            reservationId,
            ToValveIpv4(Address),
            Port,
            address,
            Map);
    }

    public static Cs2GameServerRegistration RegisterGameServer(
        ulong steamId,
        ulong sessionSteamId,
        uint version,
        string sourceIp)
    {
        lock (ServerSync)
        {
            var serverId = steamId == 0 ? ServerId : steamId;
            ServerId = serverId;
            var advertisedAddress = string.IsNullOrWhiteSpace(Address) || Address is "0.0.0.0" or "::"
                ? NormalizeAddress(sourceIp, null)
                : Address;
            var registration = new Cs2GameServerRegistration(
                serverId,
                sessionSteamId,
                FormatEndpoint(advertisedAddress, Port),
                Port,
                version,
                unchecked((uint)DateTimeOffset.UtcNow.ToUnixTimeSeconds()));
            RegisteredGameServer = registration;
            return registration;
        }
    }

    private static string NormalizeAddress(string? configured, string? advertised)
    {
        var value = string.IsNullOrWhiteSpace(configured) ? advertised : configured;
        if (string.IsNullOrWhiteSpace(value) || value == "0.0.0.0" || value == "::")
        {
            return "127.0.0.1";
        }

        return value.Trim();
    }

    private static string FormatEndpoint(string address, uint port)
    {
        return address.Contains(':', StringComparison.Ordinal) && !address.StartsWith("[", StringComparison.Ordinal)
            ? $"[{address}]:{port}"
            : $"{address}:{port}";
    }

    private static uint ToValveIpv4(string address)
    {
        if (!IPAddress.TryParse(address, out var ip) || ip.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
        {
            return 0;
        }

        var bytes = ip.GetAddressBytes();
        return (uint)(bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24));
    }
}
