import {
    encodeProto
} from "../framework/gc";

import {
    getDeadlockClientMatchLobbyOwnerId,
    clearDeadlockClientMatchLobbyOwnerId
} from "./DeadlockClientAssignment";

// SKYNET_DEADLOCK_LEAVE_LOBBY_9015_V1

/*
 * Client -> GC:
 *
 *   9015 LeaveLobby
 *
 * Official observed ordering:
 *
 *   9015
 *     -> 26 empty CMsgSOMultipleObjects for Lobby SO owner type=3
 *     -> 9016 empty response
 *     -> 25 CMsgSOCacheUnsubscribed for the same owner
 *
 * Important:
 *
 * Valve's official owner.id is NOT necessarily lobby_id.
 *
 * Our local client assignment deliberately subscribes type101 using:
 *
 *   { type: 3, id: partyId }
 *
 * Normally cleanup uses the locally remembered owner.id.
 *
 * After a Deadlock client restart the TypeSharp-local value can be
 * lost while the client still retains the old lobby assignment.
 * V2 therefore falls back to CMsgClientToGCLeaveLobby.lobby_id.
 * In our local assignment both values are the same partyId.
 */

export function requestDeadlockLeaveLobbyRaw(): boolean {
    // SKYNET_DEADLOCK_LEAVE_LOBBY_9015_RECONNECT_FALLBACK_V2
    //
    // Primary source:
    //   locally remembered type3 SO owner.id.
    //
    // Recovery source after client restart:
    //   CMsgClientToGCLeaveLobby.lobby_id.
    //
    // The request value is obtained through a C# host so uint64
    // precision never passes through a JavaScript number.
    const localOwnerId =
        getDeadlockClientMatchLobbyOwnerId();

    const requestLobbyId =
        deadlockCurrentLeaveLobbyId();

    let ownerId =
        localOwnerId;

    let ownerSource =
        "local";

    if (
        ownerId ===
            0n &&
        requestLobbyId !==
            0n
    ) {
        ownerId =
            requestLobbyId;

        ownerSource =
            "request.lobby_id";
    }

    log(
        "[9015] ========================================"
    );

    log(
        "[9015] RAW LeaveLobby received"
    );

    log(
        "[9015] local type3 owner.id=" +
        localOwnerId
    );

    log(
        "[9015] request lobby_id=" +
        requestLobbyId
    );

    if (
        localOwnerId !==
            0n &&
        requestLobbyId !==
            0n &&
        localOwnerId !==
            requestLobbyId
    ) {
        log(
            "[9015] WARNING owner mismatch local=" +
            localOwnerId +
            " request=" +
            requestLobbyId +
            "; prefer local owner.id"
        );
    }

    log(
        "[9015] cleanup owner.id=" +
        ownerId
    );

    log(
        "[9015] cleanup owner source=" +
        ownerSource
    );

    /*
     * Idempotent fallback.
     *
     * Only use 9016-only when BOTH sources are genuinely absent.
     *
     * This preserves retries for an already-clean client while
     * allowing a restarted client to unsubscribe its stale type3
     * lobby cache using request.lobby_id.
     */
    if (
        ownerId ===
        0n
    ) {
        log(
            "[9015] no local owner and no request lobby_id; reply 9016 only"
        );

        reply(
            9016,
            [],
            true
        );

        log(
            "[9015] sequence=9015->9016(idempotent)"
        );

        return true;
    }

    /*
     * ==========================================================
     * PHASE 1
     *
     * Empty SO mutation for the match-lobby cache owner.
     *
     * Official captures contain:
     *
     *   objects_modified = absent
     *   objects_added    = absent
     *   objects_removed  = absent
     *   owner.type       = 3
     *   service_id       = 1
     * ==========================================================
     */

    const update = {
        objects_modified:
            [],

        objects_added:
            [],

        objects_removed:
            [],

        version:
            ownerId +
            6000n,

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
        "[9015] phase1 msg=26"
    );

    log(
        "[9015] phase1 owner.type=3"
    );

    log(
        "[9015] phase1 owner.id=" +
        ownerId
    );

    log(
        "[9015] phase1 bytes=" +
        updateBytes.length
    );

    send(
        26,
        updateBytes,
        true
    );

    /*
     * ==========================================================
     * PHASE 2
     *
     * Empty response, job-correlated through raw reply().
     * ==========================================================
     */

    log(
        "[9015] phase2 msg=9016 empty response"
    );

    reply(
        9016,
        [],
        true
    );

    /*
     * ==========================================================
     * PHASE 3
     *
     * Unsubscribe the SAME type=3 cache.
     * ==========================================================
     */

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
        "[9015] phase3 msg=25 CacheUnsubscribed"
    );

    log(
        "[9015] phase3 owner.type=3"
    );

    log(
        "[9015] phase3 owner.id=" +
        ownerId
    );

    log(
        "[9015] phase3 bytes=" +
        unsubscribeBytes.length
    );

    send(
        25,
        unsubscribeBytes,
        true
    );

    clearDeadlockClientMatchLobbyOwnerId();

    log(
        "[9015] local match SO state cleared"
    );

    log(
        "[9015] sequence=9015->26->9016->25"
    );

    return true;
}
