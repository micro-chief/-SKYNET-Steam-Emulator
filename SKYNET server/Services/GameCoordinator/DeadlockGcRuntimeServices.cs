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


}
