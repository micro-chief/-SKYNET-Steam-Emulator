using System.Collections.Generic;
using ProtoBuf;

// ============================================================================
// Deadlock / Citadel GC protobuf runtime contracts
// AppID: 1422450
//
// Source:
//   citadel_gcmessages_client.proto
//   citadel_gcmessages_common.proto
//
// These contracts are intentionally limited to the routes currently required
// by the Deadlock client bootstrap.
// ============================================================================

// ----------------------------------------------------------------------------
// 9164 -> 9165 : GetAccountStats
// ----------------------------------------------------------------------------

[ProtoContract(Name = @"CMsgClientToGCGetAccountStats")]
public sealed class CMsgClientToGCGetAccountStats : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"account_id")]
    public uint AccountId { get; set; }

    [ProtoMember(2, Name = @"dev_access_hint")]
    public bool DevAccessHint { get; set; }

    [ProtoMember(3, Name = @"friend_access_hint")]
    public bool FriendAccessHint { get; set; }
}

[ProtoContract(Name = @"CMsgAccountHeroStats")]
public sealed class CMsgAccountHeroStats : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"hero_id")]
    public uint HeroId { get; set; }

    [ProtoMember(2, Name = @"stat_id")]
    public List<uint> StatId { get; } = new();

    [ProtoMember(3, Name = @"total_value")]
    public List<ulong> TotalValue { get; } = new();

    [ProtoMember(4, Name = @"medals_bronze")]
    public List<uint> MedalsBronze { get; } = new();

    [ProtoMember(5, Name = @"medals_silver")]
    public List<uint> MedalsSilver { get; } = new();

    [ProtoMember(6, Name = @"medals_gold")]
    public List<uint> MedalsGold { get; } = new();
}

[ProtoContract(Name = @"CMsgAccountStats")]
public sealed class CMsgAccountStats : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"account_id")]
    public uint AccountId { get; set; }

    [ProtoMember(2, Name = @"stats")]
    public List<CMsgAccountHeroStats> Stats { get; } = new();
}

[ProtoContract(Name = @"CMsgClientToGCGetAccountStatsResponse")]
public sealed class CMsgClientToGCGetAccountStatsResponse : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    // EResult:
    // 0 InternalError
    // 1 Success
    // 2 Disabled
    // 3 TooBusy
    // 4 RateLimited
    // 5 InvalidPermissions
    [ProtoMember(1, Name = @"result")]
    public int Result { get; set; }

    [ProtoMember(2, Name = @"stats")]
    public CMsgAccountStats? Stats { get; set; }
}

// ----------------------------------------------------------------------------
// 9271 -> 9272 : GetRankData
// ----------------------------------------------------------------------------

[ProtoContract(Name = @"CMsgClientToGCGetRankData")]
public sealed class CMsgClientToGCGetRankData : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);
}

[ProtoContract(Name = @"CMsgGCToClientGetRankDataResponse")]
public sealed class CMsgGCToClientGetRankDataResponse : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    // EResultCode:
    // 0 Succeeded
    // 1 Failed
    [ProtoMember(1, Name = @"result")]
    public int Result { get; set; }

    [ProtoMember(2, Name = @"current_rank_confidence")]
    public int CurrentRankConfidence { get; set; }

    [ProtoMember(3, Name = @"calibrated_rank_confidence")]
    public int CalibratedRankConfidence { get; set; }

    [ProtoMember(4, Name = @"requires_calibration")]
    public bool RequiresCalibration { get; set; }
}

// ----------------------------------------------------------------------------
// 9280 -> 9281 : HeroReleaseVoteTally
// ----------------------------------------------------------------------------

[ProtoContract(Name = @"CMsgClientToGCRequestHeroReleaseVoteTally")]
public sealed class CMsgClientToGCRequestHeroReleaseVoteTally : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"vote_rounds")]
    public List<uint> VoteRounds { get; } = new();
}

[ProtoContract(Name = @"CMsgHeroReleaseVoteTally")]
public sealed class CMsgHeroReleaseVoteTally : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"remaining_votes")]
    public uint RemainingVotes { get; set; }

    [ProtoMember(2, Name = @"votes_cast")]
    public List<uint> VotesCast { get; } = new();

    [ProtoMember(3, Name = @"daily_reward_time_stamp")]
    public uint DailyRewardTimeStamp { get; set; }
}

[ProtoContract(Name = @"CMsgGCToClientUpdateHeroReleaseVoteTally")]
public sealed class CMsgGCToClientUpdateHeroReleaseVoteTally : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"vote_round_to_tally")]
    public List<VoteRoundToTallyEntry> VoteRoundToTally { get; } = new();

    [ProtoContract(Name = @"VoteRoundToTallyEntry")]
    public sealed class VoteRoundToTallyEntry : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

        [ProtoMember(1, Name = @"key")]
        public uint Key { get; set; }

        [ProtoMember(2, Name = @"value")]
        public CMsgHeroReleaseVoteTally? Value { get; set; }
    }
}


// ----------------------------------------------------------------------------
// 9112 -> 9113 : GetMatchHistory
// ----------------------------------------------------------------------------

[ProtoContract(Name = @"CMsgClientToGCGetMatchHistory")]
public sealed class CMsgClientToGCGetMatchHistory : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"account_id")]
    public uint AccountId { get; set; }

    [ProtoMember(2, Name = @"continue_cursor")]
    public ulong ContinueCursor { get; set; }

    [ProtoMember(4, Name = @"game_mode")]
    public int GameMode { get; set; }

    [ProtoMember(5, Name = @"match_mode")]
    public int MatchMode { get; set; }

    [ProtoMember(6, Name = @"ranked_type")]
    public int RankedType { get; set; }

    [ProtoMember(7, Name = @"rank_interval")]
    public uint RankInterval { get; set; }
}

[ProtoContract(Name = @"CMsgClientToGCGetMatchHistoryResponse")]
public sealed class CMsgClientToGCGetMatchHistoryResponse : IExtensible
{
    private IExtension? _extensionData;

    IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
        Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

    [ProtoMember(1, Name = @"result")]
    public int Result { get; set; }

    [ProtoMember(2, Name = @"continue_cursor")]
    public ulong ContinueCursor { get; set; }

    [ProtoMember(3, Name = @"matches")]
    public List<Match> Matches { get; } = new();

    [ProtoContract(Name = @"Match")]
    public sealed class Match : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(ref _extensionData, createIfMissing);

        [ProtoMember(1, Name = @"match_id")]
        public ulong MatchId { get; set; }

        [ProtoMember(2, Name = @"hero_id")]
        public uint HeroId { get; set; }

        [ProtoMember(3, Name = @"match_duration_s")]
        public uint MatchDurationS { get; set; }

        [ProtoMember(4, Name = @"start_time")]
        public uint StartTime { get; set; }

        [ProtoMember(5, Name = @"match_result")]
        public uint MatchResult { get; set; }

        [ProtoMember(6, Name = @"player_team")]
        public int PlayerTeam { get; set; }

        [ProtoMember(7, Name = @"player_kills")]
        public uint PlayerKills { get; set; }

        [ProtoMember(8, Name = @"player_deaths")]
        public uint PlayerDeaths { get; set; }

        [ProtoMember(9, Name = @"player_assists")]
        public uint PlayerAssists { get; set; }

        [ProtoMember(11, Name = @"last_hits")]
        public uint LastHits { get; set; }

        [ProtoMember(12, Name = @"denies")]
        public uint Denies { get; set; }

        [ProtoMember(13, Name = @"hero_level")]
        public uint HeroLevel { get; set; }

        [ProtoMember(14, Name = @"net_worth")]
        public uint NetWorth { get; set; }

        [ProtoMember(15, Name = @"objectives_mask_team0")]
        public ulong ObjectivesMaskTeam0 { get; set; }

        [ProtoMember(16, Name = @"objectives_mask_team1")]
        public ulong ObjectivesMaskTeam1 { get; set; }

        [ProtoMember(17, Name = @"team_abandoned")]
        public bool TeamAbandoned { get; set; }

        [ProtoMember(18, Name = @"abandoned_time_s")]
        public uint AbandonedTimeS { get; set; }

        [ProtoMember(19, Name = @"match_mode")]
        public int MatchMode { get; set; }

        [ProtoMember(20, Name = @"game_mode")]
        public int GameMode { get; set; }

        [ProtoMember(21, Name = @"not_scored")]
        public bool NotScored { get; set; }

        [ProtoMember(22, Name = @"game_mode_version")]
        public uint GameModeVersion { get; set; }

        [ProtoMember(23, Name = @"brawl_score_team0")]
        public uint BrawlScoreTeam0 { get; set; }

        [ProtoMember(24, Name = @"brawl_score_team1")]
        public uint BrawlScoreTeam1 { get; set; }

        [ProtoMember(25, Name = @"brawl_avg_round_time_s")]
        public uint BrawlAvgRoundTimeS { get; set; }

        [ProtoMember(26, Name = @"player_match_outcome")]
        public int PlayerMatchOutcome { get; set; }

        [ProtoMember(27, Name = @"ranked_display_badge")]
        public uint RankedDisplayBadge { get; set; }

        [ProtoMember(28, Name = @"ranked_delta")]
        public int RankedDelta { get; set; }

        [ProtoMember(29, Name = @"ranked_calibration_match")]
        public uint RankedCalibrationMatch { get; set; }

        [ProtoMember(30, Name = @"ranked_used_demotion_protection")]
        public bool RankedUsedDemotionProtection { get; set; }
    }
}



// ============================================================================
// Deadlock / Citadel CLR contracts
// 9203 -> 9204 GetActiveMatches
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [ProtoContract(Name = @"CMsgClientToGCGetActiveMatches")]
    public sealed class CMsgClientToGCGetActiveMatches : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
    }

    [ProtoContract(Name = @"CMsgDevMatchInfo")]
    public sealed class CMsgDevMatchInfo : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
    }

    [ProtoContract(Name = @"CMsgClientToGCGetActiveMatchesResponse")]
    public sealed class CMsgClientToGCGetActiveMatchesResponse : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"active_matches")]
        public List<CMsgDevMatchInfo> ActiveMatches { get; } = new();
    }
}


// ============================================================================
// Deadlock / Citadel
// 9024 -> 9025 GetProfileCard
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [ProtoContract(Name = @"CMsgClientToGCGetProfileCard")]
    public sealed class CMsgClientToGCGetProfileCard : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"account_id")]
        public uint AccountId { get; set; }

        [ProtoMember(2, Name = @"dev_access_hint")]
        public bool DevAccessHint { get; set; }

        [ProtoMember(3, Name = @"friend_access_hint")]
        public bool FriendAccessHint { get; set; }
    }

    [ProtoContract(Name = @"CMsgCitadelProfileCard")]
    public sealed class CMsgCitadelProfileCard : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"account_id")]
        public uint AccountId { get; set; }

        [ProtoMember(2, Name = @"slots")]
        public List<Slot> Slots { get; } = new();

        [ProtoMember(3, Name = @"ranked_badge_level")]
        public uint RankedBadgeLevel { get; set; }

        [ProtoContract(Name = @"Slot")]
        public sealed class Slot : IExtensible
        {
            private IExtension? _extensionData;

            IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
                Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );

            [ProtoMember(1, Name = @"slot_id")]
            public uint SlotId { get; set; }

            [ProtoMember(2, Name = @"stat")]
            public Stat? StatValue { get; set; }

            [ProtoMember(3, Name = @"hero")]
            public Hero? HeroValue { get; set; }

            [ProtoContract(Name = @"Stat")]
            public sealed class Stat : IExtensible
            {
                private IExtension? _extensionData;

                IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
                    Extensible.GetExtensionObject(
                        ref _extensionData,
                        createIfMissing
                    );

                [ProtoMember(1, Name = @"stat_id")]
                public int StatId { get; set; }

                [ProtoMember(2, Name = @"stat_score")]
                public uint StatScore { get; set; }
            }

            [ProtoContract(Name = @"Hero")]
            public sealed class Hero : IExtensible
            {
                private IExtension? _extensionData;

                IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
                    Extensible.GetExtensionObject(
                        ref _extensionData,
                        createIfMissing
                    );

                [ProtoMember(1, Name = @"hero_id")]
                public uint HeroId { get; set; }

                [ProtoMember(2, Name = @"hero_wins")]
                public uint HeroWins { get; set; }

                [ProtoMember(3, Name = @"hero_kills")]
                public uint HeroKills { get; set; }
            }
        }
    }
}


// ============================================================================
// Deadlock / Citadel
// 9167 -> 9168 GetMatchMetaData
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [ProtoContract(Name = @"CMsgClientToGCGetMatchMetaData")]
    public sealed class CMsgClientToGCGetMatchMetaData : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"match_id")]
        public ulong MatchId { get; set; }

        [ProtoMember(3, Name = @"metadata_salt")]
        public uint MetadataSalt { get; set; }

        [ProtoMember(4, Name = @"target_account_id")]
        public uint TargetAccountId { get; set; }
    }

    [ProtoContract(Name = @"CMsgClientToGCGetMatchMetaDataResponse")]
    public sealed class CMsgClientToGCGetMatchMetaDataResponse : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"result")]
        public int Result { get; set; }

        [ProtoMember(2, Name = @"replay_salt")]
        public uint ReplaySalt { get; set; }

        [ProtoMember(3, Name = @"metadata_salt")]
        public uint MetadataSalt { get; set; }

        [ProtoMember(4, Name = @"replay_valid_through")]
        public uint ReplayValidThrough { get; set; }

        [ProtoMember(5, Name = @"replay_group_id")]
        public uint ReplayGroupId { get; set; }

        [ProtoMember(6, Name = @"replay_processing_through")]
        public uint ReplayProcessingThrough { get; set; }
    }
}


// ============================================================================
// Deadlock / Citadel
// 9123 -> 9124 PartyCreate
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [ProtoContract(Name = @"CMsgPartyMMInfo")]
    public sealed class CMsgPartyMMInfo : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"platform")]
        public int Platform { get; set; }

        // field 2 = ping_times
        // Deferred until the corresponding common contract is required.

        [ProtoMember(3, Name = @"client_version")]
        public uint ClientVersion { get; set; }

        [ProtoMember(4, Name = @"region_mode")]
        public int RegionMode { get; set; }

        [ProtoMember(5, Name = @"pgi_verified")]
        public bool PgiVerified { get; set; }
    }

    [ProtoContract(Name = @"CMsgClientToGCPartyCreate")]
    public sealed class CMsgClientToGCPartyCreate : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"party_mm_info")]
        public CMsgPartyMMInfo? PartyMmInfo { get; set; }

        [ProtoMember(3, Name = @"invite_account_id")]
        public uint InviteAccountId { get; set; }

        [ProtoMember(4, Name = @"disable_party_code")]
        public bool DisablePartyCode { get; set; }

        [ProtoMember(5, Name = @"is_private_lobby")]
        public bool IsPrivateLobby { get; set; }

        [ProtoMember(6, Name = @"region_mode")]
        public int RegionMode { get; set; }

        [ProtoMember(7, Name = @"server_search_key")]
        public string ServerSearchKey { get; set; } = "";

        [ProtoMember(8, Name = @"mm_preference")]
        public int MmPreference { get; set; }

        // field 9 = private_lobby_settings
        // Deferred until the exact common nested contract is required.

        [ProtoMember(10, Name = @"bot_difficulty")]
        public int BotDifficulty { get; set; }

        [ProtoMember(11, Name = @"hideout_search_key")]
        public string HideoutSearchKey { get; set; } = "";

        [ProtoMember(12, Name = @"dev_force_hideout")]
        public bool DevForceHideout { get; set; }

        [ProtoMember(13, Name = @"game_mode")]
        public int GameMode { get; set; }
    }

    [ProtoContract(Name = @"CMsgClientToGCPartyCreateResponse")]
    public sealed class CMsgClientToGCPartyCreateResponse : IExtensible
    {
        private IExtension? _extensionData;

        IExtension IExtensible.GetExtensionObject(bool createIfMissing) =>
            Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );

        [ProtoMember(1, Name = @"result")]
        public int Result { get; set; }

        [ProtoMember(2, Name = @"party_id")]
        public ulong PartyId { get; set; }
    }
}


// ============================================================================
// Deadlock / Citadel Shared Object
//
// Official Valve message:
//   CSOCitadelParty
//
// Required runtime FQN:
//   SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = @"CSOCitadelParty"
    )]
    public sealed class CSOCitadelParty :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        // --------------------------------------------------------------------
        // Nested: PrivateLobbySlot
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CSOCitadelParty.PrivateLobbySlot"
        )]
        public sealed class PrivateLobbySlot :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"slot_id"
            )]
            public uint SlotId
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"player_account_id"
            )]
            public uint PlayerAccountId
            {
                get;
                set;
            }
        }

        // --------------------------------------------------------------------
        // Nested: ServerRegion
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CSOCitadelParty.ServerRegion"
        )]
        public sealed class ServerRegion :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"region_id"
            )]
            public uint RegionId
            {
                get;
                set;
            }
        }

        // --------------------------------------------------------------------
        // Nested: PrivateLobbySettings
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CSOCitadelParty.PrivateLobbySettings"
        )]
        public sealed class PrivateLobbySettings :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"min_roster_size"
            )]
            public uint MinRosterSize
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"match_slots"
            )]
            public global::System.Collections.Generic.List<PrivateLobbySlot>
                MatchSlots
            {
                get;
                set;
            } = new();

            [global::ProtoBuf.ProtoMember(
                3,
                Name = @"randomize_lanes"
            )]
            public bool RandomizeLanes
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                4,
                Name = @"server_region"
            )]
            public uint ServerRegionValue
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                6,
                Name = @"is_publicly_visible"
            )]
            public bool IsPubliclyVisible
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                7,
                Name = @"cheats_enabled"
            )]
            public bool CheatsEnabled
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                8,
                Name = @"available_regions"
            )]
            public global::System.Collections.Generic.List<ServerRegion>
                AvailableRegions
            {
                get;
                set;
            } = new();

            [global::ProtoBuf.ProtoMember(
                9,
                Name = @"duplicate_heroes_enabled"
            )]
            public bool DuplicateHeroesEnabled
            {
                get;
                set;
            }
        }

        // --------------------------------------------------------------------
        // Nested: HeroSelection
        //
        // CMsgHeroSelectionMatchInfo is defined independently in Valve proto.
        // Keeping the required shape local here avoids another direct registry
        // dependency for Party encoding.
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CMsgHeroSelectionMatchInfo.Hero"
        )]
        public sealed class HeroSelection :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"hero_id"
            )]
            public uint HeroId
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"priority"
            )]
            public uint Priority
            {
                get;
                set;
            }
        }

        [global::ProtoBuf.ProtoContract(
            Name = @"CMsgHeroSelectionMatchInfo"
        )]
        public sealed class HeroSelectionMatchInfo :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"hero_selections"
            )]
            public global::System.Collections.Generic.List<HeroSelection>
                HeroSelections
            {
                get;
                set;
            } = new();

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"banned_heroes"
            )]
            public global::System.Collections.Generic.List<uint>
                BannedHeroes
            {
                get;
                set;
            } = new();
        }

        // --------------------------------------------------------------------
        // Nested: Member
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CSOCitadelParty.Member"
        )]
        public sealed class Member :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"account_id"
            )]
            public uint AccountId
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"persona_name"
            )]
            public string PersonaName
            {
                get;
                set;
            } = "";

            [global::ProtoBuf.ProtoMember(
                3,
                Name = @"rights_flags"
            )]
            public uint RightsFlags
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                4,
                Name = @"is_ready"
            )]
            public bool IsReady
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                5,
                Name = @"player_type"
            )]
            public int PlayerType
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                6,
                Name = @"compatibility_version"
            )]
            public uint CompatibilityVersion
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                7,
                Name = @"platform"
            )]
            public int Platform
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                8,
                Name = @"team"
            )]
            public uint Team
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                9,
                Name = @"hero_roster"
            )]
            public HeroSelectionMatchInfo? HeroRoster
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                10,
                Name = @"permissions"
            )]
            public ulong Permissions
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                11,
                Name = @"new_player_progress"
            )]
            public ulong NewPlayerProgress
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                12,
                Name = @"owned_heroes",
                IsPacked = true
            )]
            public global::System.Collections.Generic.List<uint>
                OwnedHeroes
            {
                get;
                set;
            } = new();

            [global::ProtoBuf.ProtoMember(
                13,
                Name = @"low_priority_games_remaining"
            )]
            public uint LowPriorityGamesRemaining
            {
                get;
                set;
            }
        }

        // --------------------------------------------------------------------
        // Nested: LeftMember
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CSOCitadelParty.LeftMember"
        )]
        public sealed class LeftMember :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"account_id"
            )]
            public uint AccountId
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"rights_flags"
            )]
            public uint RightsFlags
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                3,
                Name = @"player_type"
            )]
            public int PlayerType
            {
                get;
                set;
            }
        }

        // --------------------------------------------------------------------
        // Nested: Invite
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoContract(
            Name = @"CSOCitadelParty.Invite"
        )]
        public sealed class Invite :
            global::ProtoBuf.IExtensible
        {
            private global::ProtoBuf.IExtension? _extensionData;

            global::ProtoBuf.IExtension
                global::ProtoBuf.IExtensible.GetExtensionObject(
                    bool createIfMissing
                )
            {
                return global::ProtoBuf.Extensible.GetExtensionObject(
                    ref _extensionData,
                    createIfMissing
                );
            }

            [global::ProtoBuf.ProtoMember(
                1,
                Name = @"account_id"
            )]
            public uint AccountId
            {
                get;
                set;
            }

            [global::ProtoBuf.ProtoMember(
                2,
                Name = @"persona_name"
            )]
            public string PersonaName
            {
                get;
                set;
            } = "";

            [global::ProtoBuf.ProtoMember(
                3,
                Name = @"invited_by"
            )]
            public uint InvitedBy
            {
                get;
                set;
            }
        }

        // --------------------------------------------------------------------
        // CSOCitadelParty
        // --------------------------------------------------------------------

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"party_id"
        )]
        public ulong PartyId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            2,
            Name = @"members"
        )]
        public global::System.Collections.Generic.List<Member>
            Members
        {
            get;
            set;
        } = new();

        [global::ProtoBuf.ProtoMember(
            3,
            Name = @"invites"
        )]
        public global::System.Collections.Generic.List<Invite>
            Invites
        {
            get;
            set;
        } = new();

        [global::ProtoBuf.ProtoMember(
            4,
            Name = @"dev_server_command"
        )]
        public string DevServerCommand
        {
            get;
            set;
        } = "";

        [global::ProtoBuf.ProtoMember(
            5,
            Name = @"left_members"
        )]
        public global::System.Collections.Generic.List<LeftMember>
            LeftMembers
        {
            get;
            set;
        } = new();

        [global::ProtoBuf.ProtoMember(
            6,
            Name = @"join_code"
        )]
        public ulong JoinCode
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            7,
            Name = @"bot_difficulty"
        )]
        public int BotDifficulty
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            9,
            Name = @"match_mode"
        )]
        public int MatchMode
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            10,
            Name = @"game_mode"
        )]
        public int GameMode
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            11,
            Name = @"match_making_start_time"
        )]
        public uint MatchMakingStartTime
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            12,
            Name = @"server_search_key"
        )]
        public string ServerSearchKey
        {
            get;
            set;
        } = "";

        [global::ProtoBuf.ProtoMember(
            13,
            Name = @"is_high_skill_range_party"
        )]
        public bool IsHighSkillRangeParty
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            14,
            Name = @"chat_mode"
        )]
        public int ChatMode
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            15,
            Name = @"region_mode"
        )]
        public int RegionMode
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            16,
            Name = @"is_private_lobby"
        )]
        public bool IsPrivateLobby
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            17,
            Name = @"private_lobby_settings"
        )]
        public PrivateLobbySettings? PrivateLobbySettingsValue
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            18,
            Name = @"desires_laning_together"
        )]
        public bool DesiresLaningTogether
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            19,
            Name = @"mm_preference"
        )]
        public int MmPreference
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            21,
            Name = @"hideout_search_key"
        )]
        public string HideoutSearchKey
        {
            get;
            set;
        } = "";
    }
}


// ============================================================================
// Deadlock / Citadel
//
// 9129 CMsgClientToGCPartyAction
// 9130 CMsgClientToGCPartyActionResponse
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCPartyAction"
    )]
    public sealed class CMsgClientToGCPartyAction :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"party_id",
            DataFormat = global::ProtoBuf.DataFormat.FixedSize
        )]
        public ulong PartyId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            2,
            Name = @"target_account_id"
        )]
        public uint TargetAccountId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            3,
            Name = @"action_id"
        )]
        public int ActionId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            4,
            Name = @"uint_value"
        )]
        public ulong UIntValue
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            5,
            Name = @"bool_value"
        )]
        public bool BoolValue
        {
            get;
            set;
        }
    

        [global::ProtoBuf.ProtoMember(
            6,
            Name = @"str_value"
        )]
        public string StrValue
        {
            get;
            set;
        } = "";
}

    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCPartyActionResponse"
    )]
    public sealed class CMsgClientToGCPartyActionResponse :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"result"
        )]
        public int Result
        {
            get;
            set;
        }
    }
}


// ============================================================================
// Deadlock / Citadel PartyLeave
//
// 9125 -> 9126
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCPartyLeave"
    )]
    public sealed class CMsgClientToGCPartyLeave :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"party_id",
            DataFormat = global::ProtoBuf.DataFormat.FixedSize
        )]
        public ulong PartyId
        {
            get;
            set;
        }
    }

    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCPartyLeaveResponse"
    )]
    public sealed class CMsgClientToGCPartyLeaveResponse :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"result"
        )]
        public int Result
        {
            get;
            set;
        }
    }
}


// ============================================================================
// Deadlock / Citadel
//
// PartySetReadyState
//   9142 -> 9143
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCPartySetReadyState"
    )]
    public sealed class CMsgClientToGCPartySetReadyState :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"party_id"
        )]
        public ulong PartyId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            2,
            Name = @"ready"
        )]
        public bool Ready
        {
            get;
            set;
        }
    

    [global::ProtoBuf.ProtoMember(
        3,
        Name = "hero_roster"
    )]
    public CMsgHeroSelectionMatchInfo? HeroRoster
    {
        get;
        set;
    }
}

    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCPartySetReadyStateResponse"
    )]
    public sealed class CMsgClientToGCPartySetReadyStateResponse :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"result"
        )]
        public int Result
        {
            get;
            set;
        }
    }
}


// ============================================================
// Deadlock 9213 -> 9214 : GetFriendGameStatus
// ============================================================
namespace SKYNET.Server.GameCoordinator.Citadel
{
    [ProtoBuf.ProtoContract]
    public sealed class CMsgClientToGCGetFriendGameStatus
    {
        [ProtoBuf.ProtoMember(1, Name = "include_invited")]
        public bool IncludeInvited { get; set; }
    }

    [ProtoBuf.ProtoContract]
    public sealed class CMsgClientToGCGetFriendGameStatusResponse
    {
        [ProtoBuf.ProtoMember(1, Name = "response")]
        public int Response { get; set; }

        [ProtoBuf.ProtoMember(2, Name = "friends_played_game")]
        public List<uint> FriendsPlayedGame { get; set; } = new();

        [ProtoBuf.ProtoMember(3, Name = "friends_invited")]
        public List<uint> FriendsInvited { get; set; } = new();

        [ProtoBuf.ProtoMember(4, Name = "friends_invites_sent")]
        public List<uint> FriendsInvitesSent { get; set; } = new();
    }
}


// ============================================================================
// Deadlock / Citadel
//
// 9189 CMsgClientToGCSubmitPlaytestUser
// 9190 CMsgClientToGCSubmitPlaytestUserResponse
//
// Official fields:
//
// request:
//   uint32 target_account_id = 1;
//   string location          = 2;
//
// response:
//   EResponse response       = 1;
// ============================================================================

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCSubmitPlaytestUser"
    )]
    public sealed class CMsgClientToGCSubmitPlaytestUser :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"target_account_id"
        )]
        public uint TargetAccountId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            2,
            Name = @"location"
        )]
        public string Location
        {
            get;
            set;
        } = "";
    }

    [global::ProtoBuf.ProtoContract(
        Name = @"CMsgClientToGCSubmitPlaytestUserResponse"
    )]
    public sealed class CMsgClientToGCSubmitPlaytestUserResponse :
        global::ProtoBuf.IExtensible
    {
        private global::ProtoBuf.IExtension? _extensionData;

        global::ProtoBuf.IExtension
            global::ProtoBuf.IExtensible.GetExtensionObject(
                bool createIfMissing
            )
        {
            return global::ProtoBuf.Extensible.GetExtensionObject(
                ref _extensionData,
                createIfMissing
            );
        }

        [global::ProtoBuf.ProtoMember(
            1,
            Name = @"response"
        )]
        public int Response
        {
            get;
            set;
        }
    }
}


// ============================================================
// Deadlock 9131 -> 9132 PartyStartMatch
// ============================================================
namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = "CMsgClientToGCPartyStartMatch"
    )]
    public sealed class CMsgClientToGCPartyStartMatch
    {
        [global::ProtoBuf.ProtoMember(
            1,
            Name = "party_id",
            DataFormat = global::ProtoBuf.DataFormat.FixedSize
        )]
        public ulong PartyId
        {
            get;
            set;
        }
    }

    [global::ProtoBuf.ProtoContract(
        Name = "CMsgClientToGCPartyStartMatchResponse"
    )]
    public sealed class CMsgClientToGCPartyStartMatchResponse
    {
        [global::ProtoBuf.ProtoMember(
            1,
            Name = "result"
        )]
        public int Result
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            2,
            Name = "account_id"
        )]
        public uint AccountId
        {
            get;
            set;
        }
    }

}
// === SKYNET_DEADLOCK_9131_9132_CONTRACTS ===

namespace SKYNET.Server.GameCoordinator.Citadel
{
    [global::ProtoBuf.ProtoContract(
        Name = "CMsgHeroSelectionMatchInfo"
    )]
    public sealed class CMsgHeroSelectionMatchInfo
    {
        [global::ProtoBuf.ProtoMember(
            1,
            Name = "hero_selections"
        )]
        public global::System.Collections.Generic.List<CMsgHeroSelectionMatchInfoHero> HeroSelections
        {
            get;
        } = new();
    }

    [global::ProtoBuf.ProtoContract(
        Name = "CMsgHeroSelectionMatchInfo.Hero"
    )]
    public sealed class CMsgHeroSelectionMatchInfoHero
    {
        [global::ProtoBuf.ProtoMember(
            1,
            Name = "hero_id"
        )]
        public uint HeroId
        {
            get;
            set;
        }

        [global::ProtoBuf.ProtoMember(
            2,
            Name = "priority"
        )]
        public uint Priority
        {
            get;
            set;
        }
    }
}
