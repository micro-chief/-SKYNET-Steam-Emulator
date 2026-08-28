// SKYNET_DEADLOCK_CLIENT_ASSIGN_TYPESHARP_GLOBALS_V113
import {
    encodeProto
} from "../framework/gc";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

// SKYNET_DEADLOCK_EPHEMERAL_MATCH_LOBBY_V1_CLIENT
import {
    clearDeadlockMatchLobby,
    getCurrentDeadlockMatchId,
    getCurrentDeadlockMatchLobbyId
} from "./DeadlockMatchLobbyState";

// SKYNET_DEADLOCK_CLIENT_ASSIGN_HELPER_V111

const LOBBY_SO_TYPE_ID =
    101;

const PARTY_SO_TYPE_ID =
    105;

const SERVER_VERSION =
    6677;

// SKYNET_DEADLOCK_MULTIPLAYER_CONNECT_IP_V18
// Prefer the address registered by the dedicated reservation. Loopback remains
// a safe fallback for the established one-machine flow.
const DEFAULT_CONNECT_IP =
    2130706433;

function resolveDeadlockClientConnectIp(
    lobbyId: bigint
): number {
    const reservation: any =
        deadlockDedicatedServerState(
            lobbyId
        );

    if (
        reservation != null &&
        reservation.found == true &&
        reservation.publicIp > 0
    ) {
        return reservation.publicIp;
    }

    return DEFAULT_CONNECT_IP;
}

// SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29
function resolveDeadlockConnectIpForAccount(
    accountId: number,
    registeredIp: number
): number {
    const resolvedIp =
        deadlockResolveClientConnectIp(
            accountId,
            registeredIp
        );

    return resolvedIp >
        0
        ? resolvedIp
        : registeredIp;
}

function queueForAccount(
    accountId: number,
    messageType: number,
    payload: any
): boolean {
    return deadlockQueueGcMessageForAccount(
        accountId,
        messageType,
        payload,
        true
    );
}

// SKYNET_DEADLOCK_CLIENT_MATCH_OWNER_STATE_V1
// SKYNET_DEADLOCK_CLIENT_MATCH_LIFECYCLE_STATE_V2

let deadlockClientMatchLobbyOwnerId =
    0n;

let deadlockClientMatchServerSteamId =
    0n;

let deadlockClientMatchServerPort =
    0;

let deadlockClientMatchConnectIp =
    DEFAULT_CONNECT_IP;

let deadlockClientMatchPostMatchQueued =
    false;

// SKYNET_DEADLOCK_CLIENT_ASSIGN_AFTER_READY_V1_STATE
let deadlockClientPendingAssignmentLobbyId =
    0n;

let deadlockClientPendingServerSteamId =
    0n;

let deadlockClientPendingServerPort =
    0;

let deadlockClientPendingInGameReports =
    0;

function clearDeadlockClientPendingAssignment(): void {
    deadlockClientPendingAssignmentLobbyId =
        0n;

    deadlockClientPendingServerSteamId =
        0n;

    deadlockClientPendingServerPort =
        0;

    deadlockClientPendingInGameReports =
        0;
}

export function armDeadlockClientAssignmentAfterReady(
    serverSteamId: bigint,
    serverPort: number
): boolean {
    const lobbyId =
        getCurrentDeadlockMatchLobbyId();

    if (
        lobbyId ===
            0n ||
        serverSteamId ===
            0n ||
        serverPort <=
            0
    ) {
        log(
            "[CLIENT-ASSIGN-READY] arm rejected lobby_id=" +
            lobbyId +
            " server_steam_id=" +
            serverSteamId +
            " port=" +
            serverPort
        );
        return false;
    }

    deadlockClientPendingAssignmentLobbyId =
        lobbyId;

    deadlockClientPendingServerSteamId =
        serverSteamId;

    deadlockClientPendingServerPort =
        serverPort;

    deadlockClientPendingInGameReports =
        0;

    log(
        "[CLIENT-ASSIGN-READY] armed lobby_id=" +
        lobbyId +
        " server_steam_id=" +
        serverSteamId +
        " port=" +
        serverPort
    );

    return true;
}

export function emitDeadlockClientAssignmentAfterInGame(
    reportedLobbyId: bigint
): boolean {
    if (
        deadlockClientPendingAssignmentLobbyId ===
        0n
    ) {
        log(
            "[CLIENT-ASSIGN-READY] InGame ignored: no pending assignment"
        );
        return false;
    }

    const currentLobbyId =
        getCurrentDeadlockMatchLobbyId();

    if (
        reportedLobbyId !==
            deadlockClientPendingAssignmentLobbyId ||
        currentLobbyId !==
            deadlockClientPendingAssignmentLobbyId
    ) {
        log(
            "[CLIENT-ASSIGN-READY] stale InGame ignored reported=" +
            reportedLobbyId +
            " pending=" +
            deadlockClientPendingAssignmentLobbyId +
            " current=" +
            currentLobbyId
        );
        return false;
    }

    deadlockClientPendingInGameReports =
        deadlockClientPendingInGameReports +
        1;

    log(
        "[CLIENT-ASSIGN-READY] InGame report=" +
        deadlockClientPendingInGameReports +
        " lobby_id=" +
        reportedLobbyId
    );

    if (
        deadlockClientPendingInGameReports <
        2
    ) {
        log(
            "[CLIENT-ASSIGN-READY] deferred: pre-changelevel InGame"
        );
        return false;
    }

    const pendingServerSteamId =
        deadlockClientPendingServerSteamId;

    const pendingServerPort =
        deadlockClientPendingServerPort;

    const queued =
        emitDeadlockClientAssignment(
            pendingServerSteamId,
            pendingServerPort
        );

    if (queued) {
        clearDeadlockClientPendingAssignment();

        log(
            "[CLIENT-ASSIGN-READY] assignment queued after map active"
        );
    }
    else {
        log(
            "[CLIENT-ASSIGN-READY] assignment failed; pending state preserved"
        );
    }

    return queued;
}

export function getDeadlockClientMatchLobbyOwnerId(): bigint {
    return deadlockClientMatchLobbyOwnerId;
}

export function clearDeadlockClientMatchLobbyOwnerId(): bigint {
    const previous =
        deadlockClientMatchLobbyOwnerId;

    deadlockClientMatchLobbyOwnerId =
        0n;

    clearDeadlockMatchLobby(
        previous
    );

    deadlockClientMatchServerSteamId =
        0n;

    deadlockClientMatchServerPort =
        0;

    deadlockClientMatchConnectIp =
        DEFAULT_CONNECT_IP;

    deadlockClientMatchPostMatchQueued =
        false;

    clearDeadlockClientPendingAssignment();

    return previous;
}

export function emitDeadlockClientAssignment(
    serverSteamId: bigint,
    serverPort: number
): boolean {
    const party =
        getCurrentDeadlockPartyState();

    if (
        !party
    ) {
        log(
            "[CLIENT-ASSIGN] skipped: Party missing"
        );

        return false;
    }

    /*
     * party_id and ctx.steamId already enter the GC runtime
     * as bigint values.
     *
     * No number-to-bigint conversion is performed here.
     */
    const partyId: bigint =
        party.party_id;

    if (
        partyId ===
        0n
    ) {
        log(
            "[CLIENT-ASSIGN] skipped: party_id=0"
        );

        return false;
    }

    const matchLobbyId =
        getCurrentDeadlockMatchLobbyId();

    const matchId =
        getCurrentDeadlockMatchId();

    if (
        matchLobbyId ===
            0n ||
        matchId ===
            0n
    ) {
        log("[CLIENT-ASSIGN] skipped: lobby_id or match_id is zero");
        return false;
    }

    deadlockClientMatchLobbyOwnerId =
        matchLobbyId;

    deadlockClientMatchServerSteamId =
        serverSteamId;

    deadlockClientMatchServerPort =
        serverPort;

    deadlockClientMatchConnectIp =
        resolveDeadlockClientConnectIp(
            matchLobbyId
        );

    deadlockClientMatchPostMatchQueued =
        false;

    log(
        "[CLIENT-ASSIGN] remembered type3 owner.id=" +
        deadlockClientMatchLobbyOwnerId
    );

    log(
        "[CLIENT-ASSIGN] remembered server_steam_id=" +
        deadlockClientMatchServerSteamId
    );

    log(
        "[CLIENT-ASSIGN] remembered server_port=" +
        deadlockClientMatchServerPort
    );

    log(
        "[CLIENT-ASSIGN] remembered connect_ip=" +
        deadlockClientMatchConnectIp
    );

    const members =
        party.members ??
        [];

    if (
        members.length ===
        0
    ) {
        log(
            "[CLIENT-ASSIGN] skipped: members empty"
        );

        return false;
    }

    const matchMode =
        party.match_mode ??
        2;

    const gameMode =
        party.game_mode ??
        1;

    const assignLobby = {
        lobby_id:
            matchLobbyId,

        match_id:
            matchId,

        match_mode:
            matchMode,

        game_mode:
            gameMode,

        compatibility_version:
            SERVER_VERSION,

        server_steam_id:
            serverSteamId,

        server_state:
            0,

        udp_connect_ip:
            deadlockClientMatchConnectIp,

        udp_connect_port:
            serverPort,

        server_version:
            SERVER_VERSION,

        safe_to_abandon:
            true,

        match_punishes_abandons:
            false,

        game_mode_version:
            2
    };

    const activeLobby = {
        lobby_id:
            matchLobbyId,

        match_id:
            matchId,

        match_mode:
            matchMode,

        game_mode:
            gameMode,

        compatibility_version:
            SERVER_VERSION,

        server_steam_id:
            serverSteamId,

        server_state:
            1,

        udp_connect_ip:
            deadlockClientMatchConnectIp,

        udp_connect_port:
            serverPort,

        server_version:
            SERVER_VERSION,

        safe_to_abandon:
            true,

        match_punishes_abandons:
            false,

        game_mode_version:
            2
    };

    const lobbyOwner = {
        type:
            3,

        id:
            matchLobbyId
    };

    const syncVersion =
        matchLobbyId +
        4001n;

    /*
     * type101 phase 1:
     *
     * empty SO subscription.
     */
    const emptyLobbyCache = {
        version:
            matchLobbyId +
            4000n,

        owner_soid:
            lobbyOwner,

        service_list: [
            1
        ],

        sync_version:
            syncVersion
    };

    /*
     * Clear client FindingMatch state.
     */
    party.match_making_start_time =
        undefined;

    const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    const partyUpdate = {
        objects_modified: [
            {
                type_id:
                    PARTY_SO_TYPE_ID,

                object_data:
                    partyBytes
            }
        ],

        objects_added:
            [],

        objects_removed:
            [],

        version:
            partyId +
            4003n,

        owner_soid: {
            type:
                2,

            id:
                partyId
        },

        service_id:
            1
    };

    const emptyLobbyCacheBytes =
        encodeProto(
            "CMsgSOCacheSubscribed",
            emptyLobbyCache
        );

    const partyUpdateBytes =
        encodeProto(
            "CMsgSOMultipleObjects",
            partyUpdate
        );

    // SKYNET_DEADLOCK_STREET_BRAWL_POSTGAME_PROGRESS_V1
    //
    // The dedicated already calculates and sends CMsgPostGameProgressData
    // (including mvp_rank) to the connected client. Street Brawl is filtered
    // by the client's default post-game policy, however, so its otherwise
    // valid MVP model never reaches the Key Players screen.
    //
    // Use Valve's generic GC remote-convar message instead of inventing a
    // synthetic Deadlock payload. This only forces the existing client flow
    // on for Street Brawl; Normal keeps its native default policy.
    const forceStreetBrawlPostGameProgress =
        gameMode ===
            4;

    const streetBrawlPostGameProgressBytes =
        forceStreetBrawlPostGameProgress
            ? encodeProto(
                "CMsgGCToClientApplyRemoteConVars",
                {
                    msg: {
                        con_vars: [
                            {
                                name:
                                    "citadel_post_game_progress",

                                value:
                                    "1"
                            }
                        ]
                    }
                }
            )
            : [];

    log(
        "[CLIENT-ASSIGN] ========================================"
    );

    log(
        "[CLIENT-ASSIGN] party_id=" +
        partyId
    );

    log(
        "[CLIENT-ASSIGN] server_steam_id=" +
        serverSteamId
    );

    log(
        "[CLIENT-ASSIGN] registered_connect_ip=" +
        deadlockClientMatchConnectIp +
        " port=" +
        serverPort
    );

    let targets =
        0;

    let failed =
        0;

    for (
        let i = 0;
        i < members.length;
        i++
    ) {
        const member =
            members[i];

        const accountId =
            member.account_id ??
            0;

        if (
            accountId <=
            0
        ) {
            log(
                "[CLIENT-ASSIGN] member[" +
                i +
                "] skipped account_id=" +
                accountId
            );

            continue;
        }

        // A mixed LAN/Radmin party must not share one udp_connect_ip. Resolve
        // and encode type101 separately for each real account.
        const memberConnectIp =
            resolveDeadlockConnectIpForAccount(
                accountId,
                deadlockClientMatchConnectIp
            );

        assignLobby.udp_connect_ip =
            memberConnectIp;

        activeLobby.udp_connect_ip =
            memberConnectIp;

        const memberAssignLobbyBytes =
            encodeProto(
                "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelLobby",
                assignLobby
            );

        const memberActiveLobbyBytes =
            encodeProto(
                "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelLobby",
                activeLobby
            );

        const memberFullLobbyCacheBytes =
            encodeProto(
                "CMsgSOCacheSubscribed",
                {
                    objects: [
                        {
                            type_id:
                                LOBBY_SO_TYPE_ID,

                            object_data: [
                                memberAssignLobbyBytes
                            ]
                        }
                    ],

                    version:
                        matchLobbyId +
                        4002n,

                    owner_soid:
                        lobbyOwner,

                    service_id:
                        1,

                    service_list: [
                        0
                    ],

                    sync_version:
                        syncVersion
                }
            );

        const memberLobbyUpdateBytes =
            encodeProto(
                "CMsgSOMultipleObjects",
                {
                    objects_modified: [
                        {
                            type_id:
                                LOBBY_SO_TYPE_ID,

                            object_data:
                                memberActiveLobbyBytes
                        }
                    ],

                    objects_added:
                        [],

                    objects_removed:
                        [],

                    version:
                        matchLobbyId +
                        4004n,

                    owner_soid:
                        lobbyOwner,

                    service_id:
                        1
                }
            );

        const qPostGameProgress =
            !forceStreetBrawlPostGameProgress ||
            queueForAccount(
                accountId,
                4520,
                streetBrawlPostGameProgressBytes
            );

        const q1 =
            queueForAccount(
                accountId,
                24,
                emptyLobbyCacheBytes
            );

        const q2 =
            queueForAccount(
                accountId,
                24,
                memberFullLobbyCacheBytes
            );

        const q3 =
            queueForAccount(
                accountId,
                26,
                partyUpdateBytes
            );

        const q4 =
            queueForAccount(
                accountId,
                26,
                memberLobbyUpdateBytes
            );

        targets++;

        if (
            !q1 ||
            !q2 ||
            !q3 ||
            !q4
        ) {
            failed++;
        }

        log(
            "[CLIENT-ASSIGN] member[" +
                i +
                "] account_id=" +
                accountId +
                " connect_ip=" +
                memberConnectIp +
                " assign.bytes=" +
                memberAssignLobbyBytes.length +
                " active.bytes=" +
                memberActiveLobbyBytes.length
        );

        log(
            "[CLIENT-ASSIGN] member[" +
                i +
                "] queue=" +
                q1 +
            "," +
            q2 +
            "," +
                q3 +
                "," +
                q4
        );

        if (
            forceStreetBrawlPostGameProgress
        ) {
            log(
                "[CLIENT-ASSIGN] member[" +
                    i +
                    "] queue4520 post_game_progress=1 " +
                    qPostGameProgress
            );
        }
    }

    log(
        "[CLIENT-ASSIGN] sequence=24(empty)->24(type101 assign)->26(party clear MM)->26(type101 active)"
    );

    if (
        forceStreetBrawlPostGameProgress
    ) {
        log(
            "[CLIENT-ASSIGN] StreetBrawl pre-sequence=4520(post_game_progress=1)"
        );
    }

    log(
        "[CLIENT-ASSIGN] targets=" +
        targets +
        " failed=" +
        failed
    );

    return (
        targets >
        0 &&
        failed ===
        0
    );
}

// SKYNET_DEADLOCK_TYPE101_POSTMATCH_FANOUT_V1

/*
 * Push official type101 InGame -> PostMatch lifecycle transition.
 *
 * Trigger:
 *   Server message 10025 with server_state=PostMatch(2)
 *
 * Client:
 *   26 CMsgSOMultipleObjects
 *      objects_modified:
 *        type_id=101
 *        CSOCitadelLobby.server_state=2
 */
export function emitDeadlockClientLobbyPostMatch(
    safeToAbandon: boolean,
    reportedLobbyId: bigint
): boolean {
    if (
        deadlockClientMatchPostMatchQueued
    ) {
        log(
            "[CLIENT-POSTMATCH] duplicate suppressed"
        );

        return true;
    }

    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
        log(
            "[CLIENT-POSTMATCH] skipped: party missing"
        );

        return false;
    }

    const currentLobbyId =
        getCurrentDeadlockMatchLobbyId();

    const currentMatchId =
        getCurrentDeadlockMatchId();

    const ownerId =
        deadlockClientMatchLobbyOwnerId;

    if (
        ownerId ===
            0n ||
        currentMatchId ===
            0n
    ) {
        log(
            "[CLIENT-POSTMATCH] skipped: owner.id or match_id is zero"
        );

        return false;
    }

    if (
        currentLobbyId !==
            ownerId ||
        reportedLobbyId !==
            ownerId
    ) {
        log(
            "[CLIENT-POSTMATCH] stale lobby ignored reported=" +
            reportedLobbyId +
            " current=" +
            currentLobbyId +
            " owner.id=" +
            ownerId
        );

        return false;
    }

    if (
        deadlockClientMatchServerSteamId ===
        0n
    ) {
        log(
            "[CLIENT-POSTMATCH] skipped: server steamid=0"
        );

        return false;
    }

    if (
        deadlockClientMatchServerPort <=
        0
    ) {
        log(
            "[CLIENT-POSTMATCH] skipped: server port=" +
            deadlockClientMatchServerPort
        );

        return false;
    }

    const members =
        party.members ??
        [];

    if (
        members.length ===
        0
    ) {
        log(
            "[CLIENT-POSTMATCH] skipped: members empty"
        );

        return false;
    }

    const postMatchLobby = {
        lobby_id:
            ownerId,

        match_id:
            currentMatchId,

        match_mode:
            party.match_mode ??
            2,

        game_mode:
            party.game_mode ??
            1,

        compatibility_version:
            SERVER_VERSION,

        server_steam_id:
            deadlockClientMatchServerSteamId,

        server_state:
            2,

        udp_connect_ip:
            deadlockClientMatchConnectIp,

        udp_connect_port:
            deadlockClientMatchServerPort,

        server_version:
            SERVER_VERSION,

        safe_to_abandon:
            safeToAbandon,

        match_punishes_abandons:
            false,

        game_mode_version:
            2
    };

    const lobbyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelLobby",
            postMatchLobby
        );

    const update = {
        objects_modified: [
            {
                type_id:
                    LOBBY_SO_TYPE_ID,

                object_data:
                    lobbyBytes
            }
        ],

        objects_added:
            [],

        objects_removed:
            [],

        version:
            ownerId +
            4005n,

        owner_soid: {
            type:
                3,

            id:
                ownerId
        },

        service_id:
            1
    };

    const updateBytes =
        encodeProto(
            "CMsgSOMultipleObjects",
            update
        );

    log(
        "[CLIENT-POSTMATCH] ========================================"
    );

    log(
        "[CLIENT-POSTMATCH] owner.type=3"
    );

    log(
        "[CLIENT-POSTMATCH] owner.id=" +
        ownerId
    );

    log(
        "[CLIENT-POSTMATCH] match_id=" +
        currentMatchId
    );

    log(
        "[CLIENT-POSTMATCH] server_steam_id=" +
        deadlockClientMatchServerSteamId
    );

    log(
        "[CLIENT-POSTMATCH] server_state=PostMatch(2)"
    );

    log(
        "[CLIENT-POSTMATCH] safe_to_abandon=" +
        safeToAbandon
    );

    log(
        "[CLIENT-POSTMATCH] type101.bytes=" +
        lobbyBytes.length
    );

    log(
        "[CLIENT-POSTMATCH] msg26.bytes=" +
        updateBytes.length
    );

    let targets =
        0;

    let failed =
        0;

    for (
        let i = 0;
        i < members.length;
        i++
    ) {
        const accountId =
            members[i].account_id ??
            0;

        if (
            accountId <=
            0
        ) {
            continue;
        }

        const queued =
            queueForAccount(
                accountId,
                26,
                updateBytes
            );

        targets++;

        if (!queued) {
            failed++;
        }

        log(
            "[CLIENT-POSTMATCH] member[" +
            i +
            "] account_id=" +
            accountId +
            " queue26=" +
            queued
        );
    }

    const success =
        targets >
            0 &&
        failed ===
            0;

    if (success) {
        deadlockClientMatchPostMatchQueued =
            true;
    }

    log(
        "[CLIENT-POSTMATCH] sequence=10025(PostMatch)->26(type101 PostMatch)"
    );

    log(
        "[CLIENT-POSTMATCH] targets=" +
        targets +
        " failed=" +
        failed +
        " success=" +
        success
    );

    return success;
}


/*
 * Successful signout cleanup.
 *
 * Called by existing RequestDeadlockMatchSignoutRaw.ts after 10015
 * has been queued.
 *
 * Official order requires PostMatch type101 first.
 *
 * Therefore this helper sends ONLY CacheUnsubscribed.
 *
 * Manual LeaveLobby remains handled independently by the existing
 * RequestDeadlockLeaveLobbyRaw fallback path.
 */
export function emitDeadlockClientPostGameCleanup(): boolean {
    const ownerId =
        deadlockClientMatchLobbyOwnerId;

    if (
        ownerId ===
        0n
    ) {
        log(
            "[CLIENT-POSTGAME] skipped: owner.id=0"
        );

        return false;
    }

    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
        log(
            "[CLIENT-POSTGAME] skipped: party missing"
        );

        return false;
    }

    const currentLobbyId =
        getCurrentDeadlockMatchLobbyId();

    if (
        currentLobbyId !==
        ownerId
    ) {
        log(
            "[CLIENT-POSTGAME] owner mismatch current_lobby_id=" +
            currentLobbyId +
            " owner.id=" +
            ownerId
        );

        return false;
    }

    /*
     * Important safety:
     *
     * Never repeat the previous abrupt EMPTY->unsubscribe behavior
     * when the required official PostMatch update failed.
     */
    if (
        !deadlockClientMatchPostMatchQueued
    ) {
        log(
            "[CLIENT-POSTGAME] unsubscribe blocked: type101 PostMatch was not queued"
        );

        log(
            "[CLIENT-POSTGAME] owner preserved for manual fallback"
        );

        return false;
    }

    const members =
        party.members ??
        [];

    if (
        members.length ===
        0
    ) {
        log(
            "[CLIENT-POSTGAME] skipped: members empty"
        );

        return false;
    }

    const unsubscribe = {
        owner_soid: {
            type:
                3,

            id:
                ownerId
        }
    };

    const unsubscribeBytes =
        encodeProto(
            "CMsgSOCacheUnsubscribed",
            unsubscribe
        );

    log(
        "[CLIENT-POSTGAME] ========================================"
    );

    log(
        "[CLIENT-POSTGAME] owner.type=3"
    );

    log(
        "[CLIENT-POSTGAME] owner.id=" +
        ownerId
    );

    log(
        "[CLIENT-POSTGAME] phase=25 CacheUnsubscribed"
    );

    log(
        "[CLIENT-POSTGAME] msg25.bytes=" +
        unsubscribeBytes.length
    );

    let targets =
        0;

    let failed =
        0;

    for (
        let i = 0;
        i < members.length;
        i++
    ) {
        const accountId =
            members[i].account_id ??
            0;

        if (
            accountId <=
            0
        ) {
            continue;
        }

        const queued =
            queueForAccount(
                accountId,
                25,
                unsubscribeBytes
            );

        targets++;

        if (!queued) {
            failed++;
        }

        log(
            "[CLIENT-POSTGAME] member[" +
            i +
            "] account_id=" +
            accountId +
            " queue25=" +
            queued
        );
    }

    const success =
        targets >
            0 &&
        failed ===
            0;

    if (success) {
        clearDeadlockClientMatchLobbyOwnerId();

        log(
            "[CLIENT-POSTGAME] local match lifecycle state cleared"
        );
    }
    else {
        log(
            "[CLIENT-POSTGAME] lifecycle state preserved for fallback"
        );
    }

    log(
        "[CLIENT-POSTGAME] sequence=25(CacheUnsubscribed)"
    );

    log(
        "[CLIENT-POSTGAME] targets=" +
        targets +
        " failed=" +
        failed +
        " success=" +
        success
    );

    return success;
}
