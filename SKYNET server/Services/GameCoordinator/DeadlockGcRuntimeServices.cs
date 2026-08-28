namespace SKYNET_server.Services;

// SKYNET_DEADLOCK_GC_RUNTIME_SERVICES_V1
//
// Deadlock/Citadel GameCoordinator host-service descriptor.
//
// Stage 1 intentionally contains only identity/authorization constants.
// Database providers are added in the next step after this host-service
// skeleton has been verified by the real C# compiler.

internal static class DeadlockGcRuntimeServices
{
    public const uint AppId =
        1422450;

    public const string HostServiceName =
        "deadlock";

    // SKYNET_DEADLOCK_DB_HOST_BRIDGE_V3

    public static Func<uint, string>? AccountStatsJsonProvider
    {
        get;
        set;
    }

    // SKYNET_DEADLOCK_AUTO_ENSURE_PLAYER_V2
    public static Func<uint, ulong, string, bool>? EnsurePlayerProvider
    {
        get;
        set;
    }


    public static Func<uint, string>? HeroStatsJsonProvider
    {
        get;
        set;
    }


    // SKYNET_DEADLOCK_RANKED_DB_PROVIDER_V1
    public static Func<uint, string>? RankedSocacheJsonProvider
    {
        get;
        set;
    }


    // SKYNET_DEADLOCK_MATCH_HISTORY_DB_PROVIDER_V1
    public static Func<uint, string>? MatchHistoryJsonProvider
    {
        get;
        set;
    }

    // SKYNET_DEADLOCK_SEARCHABLE_MATCH_ID_V28_RUNTIME
    public static Func<ulong>? MatchIdAllocator
    {
        get;
        set;
    }

    // SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_RUNTIME
    // account_id, dedicated registration IP -> client-routable IPv4 uint.
    public static Func<uint, uint, uint>? ClientConnectIpResolver
    {
        get;
        set;
    }

    // SKYNET_DEADLOCK_DEDICATED_RUNTIME_V1

    // SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_RUNTIME
    public static Func<
        ulong,
        string,
        uint,
        DeadlockDedicatedServerSupervisor.DedicatedLaunchResult
    >? DedicatedServerStart
    {
        get;
        set;
    }

    public static Func<
        ulong,
        uint,
        string
    >? DedicatedServerClaim
    {
        get;
        set;
    }

    public static Func<
        uint,
        bool
    >? DedicatedServerPortReserved
    {
        get;
        set;
    }

    public static Func<
        ulong,
        DeadlockDedicatedServerSupervisor.DedicatedReservationSnapshot
    >? DedicatedServerSnapshot
    {
        get;
        set;
    }

    public static Func<
        ulong,
        string
    >? DedicatedServerStatus
    {
        get;
        set;
    }

    public static Func<
        ulong,
        string,
        bool
    >? DedicatedServerRelease
    {
        get;
        set;
    }

    // SKYNET_DEADLOCK_DEDICATED_STEAMID_GUARD_V1_RUNTIME
    // Authoritative check used by raw 10023 before issuing 10021.
    public static Func<ulong, bool>? DedicatedGameServerValidator
    {
        get;
        set;
    }

    // SKYNET_DEADLOCK_LOBBY_LIFECYCLE_10025_V1
    //
    // Authoritative state most recently reported by the dedicated
    // through CMsgServerToGCUpdateLobbyServerState (10025).
    //
    // This is deliberately separate from Ranked/Profile/MatchHistory
    // persistence. 10014 will consume its own real post-match data later.
    private static readonly
        System.Collections.Concurrent.ConcurrentDictionary<
            ulong,
            DeadlockLobbyLifecycleSnapshot
        >
        DeadlockLobbyLifecycleByLobby =
            new();

    public static DeadlockLobbyLifecycleSnapshot UpdateLobbyLifecycle(
        ulong lobbyId,
        ulong gameServerSteamId,
        uint serverState,
        bool safeToAbandon)
    {
        var snapshot =
            new DeadlockLobbyLifecycleSnapshot(
                lobbyId,
                gameServerSteamId,
                serverState,
                safeToAbandon,
                System.DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            );

        DeadlockLobbyLifecycleByLobby[
            lobbyId
        ] =
            snapshot;

        return snapshot;
    }

    public static DeadlockLobbyLifecycleSnapshot? GetLobbyLifecycle(
        ulong lobbyId)
    {
        return DeadlockLobbyLifecycleByLobby.TryGetValue(
            lobbyId,
            out var snapshot
        )
            ? snapshot
            : null;
    }

    public static bool RemoveLobbyLifecycle(
        ulong lobbyId)
    {
        return DeadlockLobbyLifecycleByLobby.TryRemove(
            lobbyId,
            out _
        );
    }

    public sealed record DeadlockLobbyLifecycleSnapshot(
        ulong LobbyId,
        ulong GameServerSteamId,
        uint ServerState,
        bool SafeToAbandon,
        long UpdatedAtUnix
    );

}
