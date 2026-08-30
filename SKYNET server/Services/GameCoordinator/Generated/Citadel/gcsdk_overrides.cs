// Deadlock uses the shared GC SDK hello/welcome wire format. Distinct CLR
// names keep its generated TypeScript contract unambiguous from CS2 while
// preserving only the fields used by the Deadlock coordinator bootstrap.

#pragma warning disable CS1591

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockSOIDOwner
{
    [global::ProtoBuf.ProtoMember(1, Name = "type")]
    public uint Type { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "id")]
    public ulong Id { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockSOCacheHaveVersion
{
    [global::ProtoBuf.ProtoMember(1, Name = "soid")]
    public DeadlockSOIDOwner? Soid { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "version", DataFormat = global::ProtoBuf.DataFormat.FixedSize)]
    public ulong Version { get; set; }

    [global::ProtoBuf.ProtoMember(3, Name = "service_id")]
    public uint ServiceId { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "cached_file_version")]
    public uint CachedFileVersion { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockSOCacheSubscriptionCheck
{
    [global::ProtoBuf.ProtoMember(1, Name = "version", DataFormat = global::ProtoBuf.DataFormat.FixedSize)]
    public ulong Version { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "owner_soid")]
    public DeadlockSOIDOwner? OwnerSoid { get; set; }

    [global::ProtoBuf.ProtoMember(3, Name = "service_id")]
    public uint ServiceId { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "service_list")]
    public global::System.Collections.Generic.List<uint> ServiceList { get; } = new();

    [global::ProtoBuf.ProtoMember(5, Name = "sync_version", DataFormat = global::ProtoBuf.DataFormat.FixedSize)]
    public ulong SyncVersion { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockClientHello
{
    [global::ProtoBuf.ProtoMember(1, Name = "version")]
    public uint Version { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "socache_have_versions")]
    public global::System.Collections.Generic.List<DeadlockSOCacheHaveVersion> SocacheHaveVersions { get; } = new();

    [global::ProtoBuf.ProtoMember(3, Name = "client_session_need")]
    public uint ClientSessionNeed { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockClientWelcome
{
    [global::ProtoBuf.ProtoMember(1, Name = "version")]
    public uint Version { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "game_data")]
    public byte[]? GameData { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "uptodate_subscribed_caches")]
    public global::System.Collections.Generic.List<DeadlockSOCacheSubscriptionCheck> UptodateSubscribedCaches { get; } = new();

    [global::ProtoBuf.ProtoMember(9, Name = "gc_socache_file_version")]
    public uint GcSocacheFileVersion { get; set; }

    [global::ProtoBuf.ProtoMember(10, Name = "txn_country_code")]
    public string TxnCountryCode { get; set; } = string.Empty;
}

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockConnectionStatus
{
    [global::ProtoBuf.ProtoMember(1, Name = "status")]
    public uint Status { get; set; }

    [global::ProtoBuf.ProtoMember(2, Name = "client_session_need")]
    public uint ClientSessionNeed { get; set; }
}

[global::ProtoBuf.ProtoContract]
public sealed class DeadlockClientWelcomeGameData
{
    [global::ProtoBuf.ProtoMember(3, Name = "compatibility_version")]
    public uint CompatibilityVersion { get; set; }

    [global::ProtoBuf.ProtoMember(4, Name = "region_mode")]
    public uint RegionMode { get; set; }

    [global::ProtoBuf.ProtoMember(5, Name = "pgi_verified")]
    public bool PgiVerified { get; set; }
}

#pragma warning restore CS1591
