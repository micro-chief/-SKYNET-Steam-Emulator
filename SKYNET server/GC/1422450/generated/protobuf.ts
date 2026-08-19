/**
 * Deadlock GC protobuf TypeScript contracts.
 *
 * Runtime:
 *   TypeSharp / SKYNET
 *
 * AppID:
 *   1422450
 *
 * ВАЖНО:
 * Message-id таблицы сделаны через export const,
 * потому что TypeSharp корректно связывает такие
 * imported module constants.
 */

// ============================================================================
// GC MESSAGE IDS
// ============================================================================

export const EGCSystemMessages = {
    SOCacheSubscribedUpToDate: 29,

    GCClientWelcome: 4004,
    GCClientHello: 4006,
    GCClientConnectionStatus: 4009,
    SOCacheSubscribed: 24,
    SOCacheUpdated: 26
} as const;



// ============================================================================
// GCSdk enums
// ============================================================================

export const ESourceEngine = {
    k_ESE_Source1: 0,
    k_ESE_Source2: 1
} as const;

export const PartnerAccountType = {
    PARTNER_NONE: 0,
    PARTNER_PERFECT_WORLD: 1,
    PARTNER_INVALID: 3
} as const;

export const GCConnectionStatus = {
    GCConnectionStatus_HAVE_SESSION: 0,
    GCConnectionStatus_GC_GOING_DOWN: 1,
    GCConnectionStatus_NO_SESSION: 2,
    GCConnectionStatus_NO_SESSION_IN_LOGON_QUEUE: 3,
    GCConnectionStatus_NO_STEAM: 4,
    GCConnectionStatus_SUSPENDED: 5,
    GCConnectionStatus_STEAM_GOING_DOWN: 6
} as const;

// ============================================================================
// SO CACHE
// ============================================================================

export interface CMsgSOIDOwner {
    type?: number;
    id?: bigint;
}

export interface CMsgSOCacheHaveVersion {
    soid?: CMsgSOIDOwner;
    version?: bigint;
    service_id?: number;
    cached_file_version?: number;
}

export interface CMsgSOCacheSubscribedType {
    type_id?: number;
    object_data?: Uint8Array[];
}

export interface CMsgSOCacheSubscribed {
    objects?: CMsgSOCacheSubscribedType[];
    version?: bigint;
    owner_soid?: CMsgSOIDOwner;
    service_id?: number;
    service_list?: number[];
    sync_version?: bigint;
}

export interface CMsgSOCacheSubscriptionCheck {
    version?: bigint;
    owner_soid?: CMsgSOIDOwner;
    service_id?: number;
    service_list?: number[];
    sync_version?: bigint;
}

/**
 * GC message 29.
 *
 * Подтверждено NetHook sequence 84.
 */
export interface CMsgSOCacheSubscribedUpToDate {
    version?: bigint;
    owner_soid?: CMsgSOIDOwner;
    service_id?: number;
    service_list?: number[];
    sync_version?: bigint;
}

// ============================================================================
// CLIENT HELLO
// ============================================================================

export interface CMsgClientHello {
    version?: number;

    socache_have_versions?:
        CMsgSOCacheHaveVersion[];

    client_session_need?: number;

    client_launcher?: number;
    client_language?: number;
    engine?: number;

    steamdatagram_login?: Uint8Array;

    platform_id?: number;
    game_msg?: Uint8Array;

    os_type?: number;

    render_system?: number;
    render_system_req?: number;

    screen_width?: number;
    screen_height?: number;
    screen_refresh?: number;

    render_width?: number;
    render_height?: number;

    swap_width?: number;
    swap_height?: number;

    is_steam_china?: boolean;
    is_steam_china_client?: boolean;

    platform_name?: string;
}

export interface CMsgConnectionStatus {
    status?: number;

    client_session_need?: number;

    queue_position?: number;
    queue_size?: number;

    wait_seconds?: number;
    estimated_wait_seconds_remaining?: number;
}

// ============================================================================
// CLIENT WELCOME
// ============================================================================

export interface CMsgClientWelcomeLocation {
    latitude?: number;
    longitude?: number;
    country?: string;
}

export interface CExtraMsgBlock {
    msg_type?: number;
    contents?: Uint8Array;
    msg_key?: bigint;
    is_compressed?: boolean;
}

export interface CMsgSteamLearnServerInfo {
    access_tokens?: unknown;
    project_infos?: unknown[];
}

export interface CMsgClientWelcome {
    version?: number;

    game_data?: Uint8Array;

    outofdate_subscribed_caches?:
        CMsgSOCacheSubscribed[];

    uptodate_subscribed_caches?:
        CMsgSOCacheSubscriptionCheck[];

    location?: CMsgClientWelcomeLocation;

    gc_socache_file_version?: number;

    txn_country_code?: string;

    game_data2?: Uint8Array;

    rtime32_gc_welcome_timestamp?: number;

    currency?: number;
    balance?: number;
    balance_url?: string;

    has_accepted_china_ssa?: boolean;
    is_banned_steam_china?: boolean;

    additional_welcome_msgs?:
        CExtraMsgBlock[];

    steam_learn_server_info?:
        CMsgSteamLearnServerInfo;
}

// ============================================================================
// ROUTE DESCRIPTORS
// ============================================================================

export interface ProtoDescriptor<TMessage> {
    readonly name: string;
}

export interface GcRoute<TRequest, TResponse> {
    readonly requestId: number;
    readonly request:
        ProtoDescriptor<TRequest>;

    readonly responseId: number;
    readonly response:
        ProtoDescriptor<TResponse>;
}

// ============================================================================
// 9164 -> 9165
// ============================================================================

export interface CMsgAccountHeroStats {
    hero_id?: number;

    stat_id?: number[];

    total_value?: bigint[];

    medals_bronze?: number[];
    medals_silver?: number[];
    medals_gold?: number[];
}

export interface CMsgAccountStats {
    account_id?: number;

    stats?:
        CMsgAccountHeroStats[];
}

export interface CMsgClientToGCGetAccountStats {
    account_id?: number;

    dev_access_hint?: boolean;
    friend_access_hint?: boolean;
}

export const CMsgClientToGCGetAccountStatsResponseEResult = {
    k_eInternalError: 0,
    k_eSuccess: 1,
    k_eDisabled: 2,
    k_eTooBusy: 3,
    k_eRateLimited: 4,
    k_eInvalidPermissions: 5
} as const;

export interface CMsgClientToGCGetAccountStatsResponse {
    result?: number;

    stats?:
        CMsgAccountStats;
}

// ============================================================================
// 9280 -> 9281
// ============================================================================

export interface CMsgHeroReleaseVoteTally {
    remaining_votes?: number;

    votes_cast?: number[];

    daily_reward_time_stamp?: number;
}

export interface CMsgClientToGCRequestHeroReleaseVoteTally {
    vote_rounds?: number[];
}

export interface CMsgGCToClientUpdateHeroReleaseVoteTallyVoteRoundToTallyEntry {
    key?: number;

    value?:
        CMsgHeroReleaseVoteTally;
}

export interface CMsgGCToClientUpdateHeroReleaseVoteTally {
    vote_round_to_tally?:
        CMsgGCToClientUpdateHeroReleaseVoteTallyVoteRoundToTallyEntry[];
}

export const EGCCitadelClientMessages = {
    k_EMsgClientToGCGetProfileCard: 9024,
    k_EMsgClientToGCGetProfileCardResponse: 9025,

    k_EMsgClientToGCGetMatchHistory: 9112,
    k_EMsgClientToGCGetMatchHistoryResponse: 9113,

    k_EMsgClientToGCGetAccountStats: 9164,
    k_EMsgClientToGCGetAccountStatsResponse: 9165,

    k_EMsgClientToGCGetAccountMatchReports: 9199,
    k_EMsgClientToGCGetAccountMatchReportsResponse: 9200,

    k_EMsgClientToGCGrantForumAccess: 9209,
    k_EMsgClientToGCGrantForumAccessResponse: 9210,

    k_EMsgClientToGCGetFriendGameStatus: 9213,
    k_EMsgClientToGCGetFriendGameStatusResponse: 9214,

    k_EMsgClientToGCGetRankData: 9271,
    k_EMsgGCToClientGetRankDataResponse: 9272,

    k_EMsgClientToGCRequestHeroReleaseVoteTally: 9280,
    k_EMsgGCToClientUpdateHeroReleaseVoteTally: 9281,
    k_EMsgClientToGCSubmitPlaytestUser: 9189,
    k_EMsgClientToGCSubmitPlaytestUserResponse: 9190,
    k_EMsgClientToGCStartRankedInterval: 9289,
    k_EMsgClientToGCStartRankedIntervalResponse: 9290,
    k_EMsgGCToClientDevPlaytestStatus: 9019,

  k_EMsgClientToGCStartMatchmaking: 9010,

  k_EMsgClientToGCStartMatchmakingResponse: 9011,
    k_EMsgClientToGCPartyCreate: 9123,
    k_EMsgClientToGCPartyCreateResponse: 9124,

    k_EMsgClientToGCGetActiveMatches: 9203,
    k_EMsgClientToGCGetActiveMatchesResponse: 9204,

    k_EMsgClientToGCGetMatchMetaData: 9167,
    k_EMsgClientToGCGetMatchMetaDataResponse: 9168,
    k_EMsgClientToGCStopMatchmaking: 9012,
    k_EMsgClientToGCStopMatchmakingResponse: 9013,
    k_EMsgClientToGCUpdateRoster: 9026,
    k_EMsgClientToGCUpdateRosterResponse: 9027,
    k_EMsgClientToGCIsInMatchmaking: 9017,
    k_EMsgClientToGCIsInMatchmakingResponse: 9018,
    k_EMsgClientToGCPartySetMode: 9207,
    k_EMsgClientToGCPartySetModeResponse: 9208,
    k_EMsgClientToGCPartyStartMatch: 9131,
    k_EMsgClientToGCPartyStartMatchResponse: 9132,
} as const;



// -----------------------------------------------------------------------------
// 9203 -> 9204 : Active matches
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetActiveMatches {
}

export interface CMsgDevMatchInfoMatchPlayer {
    account_id?: number;
    team?: number;
    abandoned?: boolean;
    hero_id?: number;
}

export interface CMsgDevMatchInfoTeam {
    team?: number;
    net_worth?: number;
    objectives_mask?: bigint;
    brawl_score?: number;
}

export interface CMsgDevMatchInfo {
    start_time?: number;
    winning_team?: number;
    match_id?: bigint;

    players?: CMsgDevMatchInfoMatchPlayer[];

    lobby_id?: bigint;
    game_mode_version?: number;

    net_worth_team_0?: number;
    net_worth_team_1?: number;

    duration_s?: number;

    spectators?: number;
    open_spectator_slots?: number;

    objectives_mask_team0?: bigint;
    objectives_mask_team1?: bigint;

    match_mode?: number;
    game_mode?: number;

    match_score?: number;
    region_mode?: number;
    compat_version?: number;

    team_stats?: CMsgDevMatchInfoTeam[];
}

export interface CMsgClientToGCGetActiveMatchesResponse {
    active_matches?: CMsgDevMatchInfo[];
}



// -----------------------------------------------------------------------------
// 9167 -> 9168 : GetMatchMetaData
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetMatchMetaData {
    match_id?: bigint;
    metadata_salt?: number;
    target_account_id?: number;
}

export const CMsgClientToGCGetMatchMetaDataResponse_EResult = {
    k_eResult_InternalError: 0,
    k_eResult_Success: 1,
    k_eResult_InvalidPermission: 2,
    k_eResult_TemporarilyDisabled: 3,
    k_eResult_TooBusy: 4,
    k_eResult_RateLimited: 5,
    k_eResult_InvalidMatch: 6,
    k_eResult_MatchInFlight: 7,
    k_eResult_Timeout: 8,
} as const;

export interface CMsgClientToGCGetMatchMetaDataResponse {
    result?: number;
    replay_salt?: number;
    metadata_salt?: number;
    replay_valid_through?: number;
    replay_group_id?: number;
    replay_processing_through?: number;
}

// === DEADLOCK_RUNTIME_PROTO_ROUTES_BEGIN ===

// -----------------------------------------------------------------------------
// 9271 -> 9272 : Rank data
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetRankData {
}

export enum CMsgGCToClientGetRankDataResponseEResultCode {
    k_Succeeded = 0,
    k_Failed = 1,
}

export interface CMsgGCToClientGetRankDataResponse {
    result?: CMsgGCToClientGetRankDataResponseEResultCode;
    current_rank_confidence?: number;
    calibrated_rank_confidence?: number;
    requires_calibration?: boolean;
}

// -----------------------------------------------------------------------------
// 9213 -> 9214 : Friend game status
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetFriendGameStatus {
    include_invited?: boolean;
}

export enum CMsgClientToGCGetFriendGameStatusResponseEResponse {
    k_eInternalError = 0,
    k_eSuccess = 1,
    k_eTooBusy = 2,
    k_eDisabled = 3,
}

export interface CMsgClientToGCGetFriendGameStatusResponse {
    response?: CMsgClientToGCGetFriendGameStatusResponseEResponse;
    friends_played_game?: number[];
    friends_invited?: number[];
    friends_invites_sent?: number[];
}

// -----------------------------------------------------------------------------
// 9024 -> 9025 : Profile card
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetProfileCard {
    account_id?: number;
    dev_access_hint?: boolean;
    friend_access_hint?: boolean;
}

export enum CMsgCitadelProfileCardEStatID {
    k_eStat_Invalid = 0,
    k_eStat_Wins = 1,
    k_eStat_Kills = 2,
    k_eStat_GamesPlayed = 3,
}

export interface CMsgCitadelProfileCardSlotStat {
    stat_id?: CMsgCitadelProfileCardEStatID;
    stat_score?: number;
}

export interface CMsgCitadelProfileCardSlotHero {
    hero_id?: number;
    hero_wins?: number;
    hero_kills?: number;
}

export interface CMsgCitadelProfileCardSlot {
    slot_id?: number;
    stat?: CMsgCitadelProfileCardSlotStat;
    hero?: CMsgCitadelProfileCardSlotHero;
}

export interface CMsgCitadelProfileCard {
    account_id?: number;
    slots?: CMsgCitadelProfileCardSlot[];
    ranked_badge_level?: number;
}

// -----------------------------------------------------------------------------
// 9112 -> 9113 : Match history
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetMatchHistory {
    account_id?: number;
    continue_cursor?: bigint;
    game_mode?: number;
    match_mode?: number;
    ranked_type?: number;
    rank_interval?: number;
}

export interface CMsgClientToGCGetMatchHistoryResponseMatch {
    match_id?: bigint;
    hero_id?: number;
    match_duration_s?: number;
    start_time?: number;
    match_result?: number;
    player_team?: number;
    player_kills?: number;
    player_deaths?: number;
    player_assists?: number;
    last_hits?: number;
    denies?: number;
    hero_level?: number;
    net_worth?: number;
    objectives_mask_team0?: bigint;
    objectives_mask_team1?: bigint;
    team_abandoned?: boolean;
    abandoned_time_s?: number;
    match_mode?: number;
    game_mode?: number;
    not_scored?: boolean;
    game_mode_version?: number;
    brawl_score_team0?: number;
    brawl_score_team1?: number;
    brawl_avg_round_time_s?: number;
    player_match_outcome?: number;
    ranked_display_badge?: number;
    ranked_delta?: number;
    ranked_calibration_match?: number;
    ranked_used_demotion_protection?: boolean;
}

export enum CMsgClientToGCGetMatchHistoryResponseEResult {
    k_eResult_InternalError = 0,
    k_eResult_Success = 1,
    k_eResult_InvalidPermission = 2,
    k_eResult_TemporarilyDisabled = 3,
    k_eResult_TooBusy = 4,
    k_eResult_RateLimited = 5,
}

export interface CMsgClientToGCGetMatchHistoryResponse {
    result?: CMsgClientToGCGetMatchHistoryResponseEResult;
    continue_cursor?: bigint;
    matches?: CMsgClientToGCGetMatchHistoryResponseMatch[];
}

// -----------------------------------------------------------------------------
// 9209 -> 9210 : Forum access
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGrantForumAccess {
    email?: string;
}

export enum CMsgClientToGCGrantForumAccessResponseEResponse {
    k_eInternalError = 0,
    k_eSuccess = 1,
    k_eAlreadyClaimed = 2,
    k_eDisabled = 3,
    k_eEmailUsed = 4,
}

export interface CMsgClientToGCGrantForumAccessResponse {
    response?: CMsgClientToGCGrantForumAccessResponseEResponse;
    email?: string;
    username?: string;
    forum_password?: string;
}

// -----------------------------------------------------------------------------
// 9199 -> 9200 : Account match reports
// -----------------------------------------------------------------------------

export interface CMsgClientToGCGetAccountMatchReports {
    match_id?: bigint;
}

export interface CMsgClientToGCGetAccountMatchReportsResponseReport {
    account_id?: number;
}

export interface CMsgClientToGCGetAccountMatchReportsResponseCommend {
    account_id?: number;
}

export enum CMsgClientToGCGetAccountMatchReportsResponseEResponse {
    k_eInternalError = 0,
    k_eSuccess = 1,
    k_eDisabled = 4,
    k_eTooBusy = 7,
}

export interface CMsgClientToGCGetAccountMatchReportsResponse {
    response?: CMsgClientToGCGetAccountMatchReportsResponseEResponse;
    reports?: CMsgClientToGCGetAccountMatchReportsResponseReport[];
    commends?: CMsgClientToGCGetAccountMatchReportsResponseCommend[];
}


// -----------------------------------------------------------------------------
// 9189 -> 9190 : Submit playtest user
// -----------------------------------------------------------------------------

export interface CMsgClientToGCSubmitPlaytestUser {
    location?: string;
    target_account_id?: number;
}

export const CMsgClientToGCSubmitPlaytestUserResponseEResponse = {
    eResponse_Success: 0,
    eResponse_InternalError: 1,
    eResponse_InvalidFriend: 3,
    eResponse_NotFriendsLongEnough: 4,
    eResponse_AlreadyHasGame: 5,
    eResponse_LimitedUser: 6,
    eResponse_InviteLimitReached: 7
} as const;

export interface CMsgClientToGCSubmitPlaytestUserResponse {
    response?: number;
}

// -----------------------------------------------------------------------------
// 9289 -> 9290 : Start ranked interval
// -----------------------------------------------------------------------------

export interface CMsgClientToGCStartRankedInterval {
    rank_type?: number;
    interval?: number;
}

export const CMsgClientToGCStartRankedIntervalResponseEResponse = {
    k_eInternalError: 0,
    k_eSuccess: 1,
    k_eIntervalInactive: 2,
    k_eAlreadyStarted: 3,
    k_eNotEnoughMatchesPlayed: 4,
    k_eNotEnoughHeroesUnlocked: 5
} as const;

export interface CMsgClientToGCStartRankedIntervalResponse {
    response?: number;
}


// -----------------------------------------------------------------------------
// Deadlock SO / matchmaking bootstrap additions
// -----------------------------------------------------------------------------

export interface CMsgSOMultipleObjectsSingleObject {
    type_id?: number;
    object_data?: Uint8Array;
}

export interface CMsgSOMultipleObjects {
    objects_modified?: CMsgSOMultipleObjectsSingleObject[];
    version?: bigint;
    objects_added?: CMsgSOMultipleObjectsSingleObject[];
    objects_removed?: CMsgSOMultipleObjectsSingleObject[];
    owner_soid?: CMsgSOIDOwner;
    service_id?: number;
}

export interface CMsgPartyMMInfo {
    platform?: number;
    ping_times?: any;
    client_version?: number;
    region_mode?: number;
    pgi_verified?: boolean;
}

export interface CSOCitadelPartyPrivateLobbySlot {
    slot_id?: number;
    player_account_id?: number;
}

export interface CSOCitadelPartyServerRegion {
    region_id?: number;
}

export interface CSOCitadelPartyPrivateLobbySettings {
    min_roster_size?: number;
    match_slots?: CSOCitadelPartyPrivateLobbySlot[];
    randomize_lanes?: boolean;
    server_region?: number;
    is_publicly_visible?: boolean;
    cheats_enabled?: boolean;
    available_regions?: CSOCitadelPartyServerRegion[];
    duplicate_heroes_enabled?: boolean;
}

export interface CMsgClientToGCPartyCreate {
    party_mm_info?: CMsgPartyMMInfo;
    invite_account_id?: number;
    disable_party_code?: boolean;
    is_private_lobby?: boolean;
    region_mode?: number;
    server_search_key?: string;
    mm_preference?: number;
    private_lobby_settings?: CSOCitadelPartyPrivateLobbySettings;
    bot_difficulty?: number;
    hideout_search_key?: string;
    dev_force_hideout?: boolean;
    game_mode?: number;
}

export const CMsgClientToGCPartyCreateResponseEResponse = {
    k_eInternalError: 0,
    k_eSuccess: 1,
    k_eAlreadyInParty: 2,
    k_eDisabled: 3,
    k_eInvalidVersion: 4,
    k_eNoRegionPings: 5,
    k_eTooBusy: 6,
    k_eRateLimited: 7,
    k_eNotFriends: 8,
    k_eRegionInfoNotProvided: 9,
    k_eDurationControlBlocked: 10,
    k_eInMatchmaking: 11,
    k_ePlayerDoesntHaveGame: 12
} as const;

export interface CMsgClientToGCPartyCreateResponse {
    result?: number;
    party_id?: bigint;
}

export interface CSOCitadelPartyMember {
    account_id?: number;
    persona_name?: string;
    rights_flags?: number;
    is_ready?: boolean;
    player_type?: number;
    compatibility_version?: number;
    platform?: number;
    team?: number;
    hero_roster?: any;
    permissions?: bigint;
    new_player_progress?: bigint;
    owned_heroes?: number[];
    low_priority_games_remaining?: number;
    ranked_scores?: any[];
}

export interface CSOCitadelParty {
    party_id?: bigint;
    members?: CSOCitadelPartyMember[];
    invites?: any[];
    dev_server_command?: string;
    left_members?: any[];
    join_code?: bigint;
    bot_difficulty?: number;
    match_mode?: number;
    game_mode?: number;
    match_making_start_time?: number;
    server_search_key?: string;
    is_high_skill_range_party?: boolean;
    chat_mode?: number;
    region_mode?: number;
    is_private_lobby?: boolean;
    private_lobby_settings?: CSOCitadelPartyPrivateLobbySettings;
    desires_laning_together?: boolean;
    mm_preference?: number;
    hideout_search_key?: string;
}

export interface CSORankedProgress {
    account_id?: number;
    rank_type?: number;
    rank_interval?: number;
    progress?: number;
    max_progress?: number;
    rank?: number;
    max_rank?: number;
    leaderboard_rank?: number;
    max_leaderboard_rank?: number;
    demote_protect_games?: number;
    calibrate_games?: number;
    win_bit_mask?: number;
    match_count?: number;
    last_match_hero_id?: number;
    last_match_outcome?: number;
}

export interface CMsgGCToClientDevPlaytestStatusDevQueueSize {
    match_mode?: number;
    queue_size?: number;
    game_mode?: number;
}

export interface CMsgGCToClientDevPlaytestStatusLeaderboardTier {
    leaderboard_rank?: number;
    required_progress?: number;
}

export interface CMsgGCToClientDevPlaytestStatusActiveRankedMode {
    rank_type?: number;
    rank_interval?: number;
    leaderboard_tiers?: CMsgGCToClientDevPlaytestStatusLeaderboardTier[];
}

export interface CMsgGCToClientDevPlaytestStatus {
    dev_queue_size?: CMsgGCToClientDevPlaytestStatusDevQueueSize[];
    dev_available_servers?: number;
    coop_bot_max_wait_s?: number;
    is_mm_enabled?: boolean;
    locked_heroes?: boolean;
    party_shared_heroes?: boolean;
    hero_whitelists?: any[];
    mm_pause_time?: number;
    valid_client_versions?: number[];
    active_match_count?: number;
    roster_non_limited_heroes?: number;
    matches_per_priority_token?: number;
    active_ranked_modes?: CMsgGCToClientDevPlaytestStatusActiveRankedMode[];
}



// === SKYNET_START_MATCHMAKING_BEGIN ===

// ============================================================================
// 9010 -> 9011 START MATCHMAKING
// ============================================================================

export interface CMsgStartFindingMatchInfo {
    server_search_key?: string;
    server_command_string?: string;

    match_mode?: number;
    game_mode?: number;

    bot_difficulty?: number;
    region_mode?: number;

    prefer_solo_only?: boolean;

    mm_preference?: number;
}

export interface CMsgRegionPingTimesClient {
    data_center_codes?: number[];
    ping_times?: number[];
}

export interface CMsgHeroSelectionMatchInfoHero {
    hero_id?: number;
    priority?: number;
}

export interface CMsgHeroSelectionMatchInfo {
    hero_selections?:
        CMsgHeroSelectionMatchInfoHero[];

    banned_heroes?: number[];
}

export interface CMsgClientToGCStartMatchmaking {
    client_version?: number;
    client_platform?: number;

    match_info?:
        CMsgStartFindingMatchInfo;

    ping_times?:
        CMsgRegionPingTimesClient;

    heroes?:
        CMsgHeroSelectionMatchInfo;

    pgi_verified?: boolean;
}

export const CMsgClientToGCStartMatchmakingResponseEResultCode = {
    k_EResult_OK: 0,

    k_EResult_AlreadyFindingMatch: 1,
    k_EResult_PartyMemberInLobby: 2,
    k_EResult_InvalidClientVersion: 3,

    k_EResult_MatchmakingDisabled: 4,
    k_EResult_MatchmakingTooBusy: 5,
    k_EResult_InternalError: 6,

    k_EResult_NoRegionPings: 7,
    k_EResult_InParty: 8,
    k_EResult_ModeLocked: 9,
    k_EResult_ModeBanned: 10,

    k_EResult_RegionInfoNotProvided: 11,
    k_EResult_DurationControlBlocked: 12,

    k_EResult_InvalidHeroSelection: 13,
    k_EResult_HeroesNotUnlocked: 14,

    k_EResult_PermanentBan: 15,

    k_EResult_RankedMMNotOpen: 16,
    k_EResult_RankedNotUnlocked: 17,
    k_EResult_NoRankedWhileInLowPri: 18,
    k_EResult_NoRankedWhileCommsBanned: 19,
    k_EResult_NoRankedWhileReportBanned: 20,

    k_EResult_HeroLabsMMNotOpen: 21,
    k_EResult_HeroLabsNotUnlocked: 22,
    k_EResult_NoHeroLabsWhileInLowPri: 23,

    k_EResult_AccountLocked: 24,
    k_EResult_TooManyLimitedHeroes: 25,

    k_EResult_UnverifiedPGI: 26,
    k_EResult_RankedInvalidPartySize: 27,

    k_EResult_NoBrawlWhileInLowPri: 28
} as const;

export interface CMsgClientToGCStartMatchmakingResponse {
    result?: number;
    time_stamp?: number;
    debug_message?: string;
}

// === SKYNET_START_MATCHMAKING_END ===




// === SKYNET_MM_CONTROL_ROUTES_BEGIN ===

// ============================================================================
// 9012 -> 9013 STOP MATCHMAKING
// ============================================================================

export interface CMsgClientToGCStopMatchmaking {
}

export interface CMsgClientToGCStopMatchmakingResponse {
    success?: boolean;
}

// ============================================================================
// 9026 -> 9027 UPDATE ROSTER
// ============================================================================

export interface CMsgClientToGCUpdateRoster {
    heroes?: CMsgHeroSelectionMatchInfo;
    game_mode?: number;
    match_mode?: number;
}

export const CMsgClientToGCUpdateRosterResponseEResponse = {
    k_eInternalError: 0,
    k_eSuccess: 1,
    k_eDisabled: 2,
    k_eTooBusy: 3,
    k_eRateLimited: 4,
    k_eMMBusy: 5,
    k_eInvalidHeroSelection: 6,
    k_eHeroesNotUnlocked: 7,
    k_eNotInMatchmaking: 8,
    k_eInvalidPartyRoster: 9,
    k_eInvalidMode: 10
} as const;

export interface CMsgClientToGCUpdateRosterResponse {
    result?: number;
}

// === SKYNET_MM_CONTROL_ROUTES_END ===


// === SKYNET_IS_IN_MATCHMAKING_BEGIN ===

export interface CMsgClientToGCIsInMatchmaking {
}

export interface CMsgClientToGCIsInMatchmakingResponse {
    in_matchmaking?: boolean;
}

// === SKYNET_IS_IN_MATCHMAKING_END ===


// === SKYNET_PARTY_SET_MODE_BEGIN ===

// ============================================================================
// 9207 -> 9208 PARTY SET MODE
// ============================================================================

export interface CMsgClientToGCPartySetMode {
    party_id?: bigint;

    match_mode?: number;
    game_mode?: number;

    bot_difficulty?: number;

    dev_server_command?: string;

    region_mode?: number;
}

export const CMsgClientToGCPartySetModeResponseEResponse = {
    k_eInternalError: 0,
    k_eSuccess: 1,
    k_eInvalidPartyID: 2,
    k_eInvalidPermissions: 3,
    k_ePlayerPermanentBanned: 4,
    k_eInvalidValue: 5,
    k_eInMatchMaking: 6,
    k_eInMatch: 7,
    k_eDisabled: 8,
    k_eTooBusy: 9,
    k_eRateLimited: 10,
    k_eAlreadyDrafting: 11,
    k_eCannotChangeWhileReady: 12,
    k_eTooFewPlayers: 13,
    k_eTooManyPlayers: 14,
    k_ePlayerBanned: 15,
    k_eTooManyHighMMR: 16,
    k_eFiveStacksNotAllowed: 18,
    k_eRankedMMNotOpen: 19,
    k_eRankedNotunlocked: 20,
    k_eHeroLabsMMNotOpen: 21,
    k_eHeroLabsNotUnlocked: 22,
    k_eNoHeroLabsWhileInLowPri: 23,
    k_eNoHighRangeFiveStack: 24,
    k_eAccountLocked: 25,
    k_eRankedInCalibration: 26,
    k_eRankedInvalidPartySize: 27,
    k_eRankedPartySkillRangeInvalid: 28,
    k_eRankedMemberInLowPri: 29,
    k_eRankedMemberCurrentlyBanned: 30,
    k_eBrawlMemberInLowPri: 31
} as const;

export interface CMsgClientToGCPartySetModeResponse {
    result?: number;
    time_stamp?: number;
    account_id?: number;
}

// === SKYNET_PARTY_SET_MODE_END ===

// === DEADLOCK_RUNTIME_PROTO_ROUTES_END ===



// ============================================================================
// Deadlock PartyAction
// ============================================================================

export interface CMsgClientToGCPartyAction {
    readonly party_id?: bigint;
    readonly target_account_id?: number;
    readonly action_id?: number;
    readonly uint_value?: bigint;
    readonly bool_value?: boolean;
}

export interface CMsgClientToGCPartyActionResponse {
    readonly result?: number;
}

export const CMsgClientToGCPartyAction_EAction = {
    KickUser: 1,
    CancelInvite: 2,
    CancelFindMatch: 3,
    SetReady: 4,
    SetPlayerType: 5,
    SetBotDifficulty: 6,
    EnablePartyCode: 7,
    SetMemberTeam: 8
} as const;

export const CMsgClientToGCPartyActionResponse_EResponse = {
    InternalError: 0,
    Success: 1,
    InvalidPartyId: 2,
    InvalidPermissions: 3,
    InvalidTarget: 4,
    InvalidValue: 5,
    InMatchMaking: 6,
    InMatch: 7,
    Disabled: 8,
    TooBusy: 9,
    RateLimited: 10
} as const;


// ============================================================================
// 9131 -> 9132 : PartyStartMatch
// ============================================================================

export interface CMsgClientToGCPartyStartMatch {
    party_id?: bigint;
}


export interface CMsgClientToGCPartyStartMatchResponse {
    result?: number;
    account_id?: number;
}
