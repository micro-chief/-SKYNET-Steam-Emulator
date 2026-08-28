// CS2 uses newer gcsdk hello/welcome field layouts than the shared Dota
// contracts already compiled into the emulator. These four small envelopes
// intentionally keep distinct CLR names while preserving the CS2 wire layout.

#pragma warning disable CS1591

[global::ProtoBuf.ProtoContract]
public sealed class Cs2ClientHello
{
    [global::ProtoBuf.ProtoMember(1, Name = "version")]
    public uint Version { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "socache_have_versions")]
    public global::System.Collections.Generic.List<CMsgSOCacheHaveVersion> SocacheHaveVersions { get; } = new();

    [global::ProtoBuf.ProtoMember(3, Name = "client_session_need")]
    public uint ClientSessionNeed { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "client_launcher")]
    public uint ClientLauncher { get; set; }

    [global::ProtoBuf.ProtoMember(9, Name = "steam_launcher")]
    public uint SteamLauncher { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class Cs2ServerHello
{
    [global::ProtoBuf.ProtoMember(1, Name = "version")]
    public uint Version { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "socache_have_versions")]
    public global::System.Collections.Generic.List<CMsgSOCacheHaveVersion> SocacheHaveVersions { get; } = new();

    [global::ProtoBuf.ProtoMember(3, Name = "legacy_client_session_need")]
    public uint LegacyClientSessionNeed { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "client_launcher")]
    public uint ClientLauncher { get; set; }

    [global::ProtoBuf.ProtoMember(6, Name = "legacy_steamdatagram_routing")]
    public byte[]? LegacySteamdatagramRouting { get; set; }

    [global::ProtoBuf.ProtoMember(7, Name = "required_internal_addr")]
    public uint RequiredInternalAddr { get; set; }

    [global::ProtoBuf.ProtoMember(8, Name = "steamdatagram_login")]
    public byte[]? SteamdatagramLogin { get; set; }

    [global::ProtoBuf.ProtoMember(9, Name = "socache_control")]
    public uint SocacheControl { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class Cs2ClientWelcome
{
    [global::ProtoBuf.ProtoMember(1, Name = "version")]
    public uint Version { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "game_data")]
    public byte[]? GameData { get; set; }

    [global::ProtoBuf.ProtoMember(3, Name = "outofdate_subscribed_caches")]
    public global::System.Collections.Generic.List<CMsgSOCacheSubscribed> OutofdateSubscribedCaches { get; } = new();

    [global::ProtoBuf.ProtoMember(4, Name = "uptodate_subscribed_caches")]
    public global::System.Collections.Generic.List<CMsgSOCacheSubscriptionCheck> UptodateSubscribedCaches { get; } = new();

    [global::ProtoBuf.ProtoMember(6, Name = "game_data2")]
    public byte[]? GameData2 { get; set; }

    [global::ProtoBuf.ProtoMember(7, Name = "rtime32_gc_welcome_timestamp")]
    public uint Rtime32GcWelcomeTimestamp { get; set; }

    [global::ProtoBuf.ProtoMember(8, Name = "currency")]
    public uint Currency { get; set; }

    [global::ProtoBuf.ProtoMember(9, Name = "balance")]
    public uint Balance { get; set; }

    [global::ProtoBuf.ProtoMember(10, Name = "balance_url")]
    public string BalanceUrl { get; set; } = string.Empty;

    [global::ProtoBuf.ProtoMember(11, Name = "txn_country_code")]
    public string TxnCountryCode { get; set; } = string.Empty;
}

[global::ProtoBuf.ProtoContract]
public sealed class Cs2ConnectionStatus
{
    [global::ProtoBuf.ProtoMember(1, Name = "status")]
    public int Status { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "client_session_need")]
    public uint ClientSessionNeed { get; set; }

    [global::ProtoBuf.ProtoMember(3, Name = "queue_position")]
    public int QueuePosition { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "queue_size")]
    public int QueueSize { get; set; }
}

// Message 9160 has no named message body in Valve's current public proto, but
// the CS2 client exchanges a single event id in field 1 in both directions.
[global::ProtoBuf.ProtoContract]
public sealed class Cs2TournamentPredictions
{
    [global::ProtoBuf.ProtoMember(1, Name = "eventid")]
    public uint Eventid { get; set; }
}
