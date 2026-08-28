// SKYNET_DEADLOCK_TYPE101_POSTMATCH_FANOUT_V1_IMPORT
// SKYNET_DEADLOCK_TYPE101_REPORTED_LOBBY_GUARD_V2
// SKYNET_DEADLOCK_CLIENT_ASSIGN_AFTER_READY_V1_10025
import {
    emitDeadlockClientAssignmentAfterInGame,
    emitDeadlockClientLobbyPostMatch
} from "./DeadlockClientAssignment";

/*
 * SKYNET_DEADLOCK_RAW_10025_LOBBY_STATE_V1
 *
 * Deadlock / Citadel AppID 1422450
 *
 * RAW one-way GameServer lifecycle update:
 *
 *   10025 CMsgServerToGCUpdateLobbyServerState
 *
 * Current protobuf:
 *
 *   field 1 uint64 lobby_id
 *   field 2 ELobbyServerState server_state
 *   field 3 bool safe_to_abandon
 *
 * IMPORTANT:
 * There is NO response message for 10025.
 */

export function requestDeadlockUpdateLobbyServerStateRaw(): boolean {
    if (
        messageType() !=
        10025
    ) {
        return false;
    }

    const result: any =
        deadlockUpdateCurrentLobbyServerState();

    if (
        result ==
        null
    ) {
        log(
            "[10025-GS] rejected: host returned null"
        );

        return true;
    }

    log(
        "[10025-GS] accepted=" +
        result.accepted +
        " lobby_id=" +
        result.lobbyId +
        " state=" +
        result.serverStateName +
        "(" +
        result.serverState +
        ")" +
        " safe_to_abandon=" +
        result.safeToAbandon +
        " reason=" +
        result.reason
    );

    // SKYNET_DEADLOCK_CLIENT_ASSIGN_AFTER_READY_V1_10025
    // The first InGame report is emitted immediately before the dedicated
    // destroys its initial socket for Changelevel. The second arrives after
    // ss_active and is the safe point for client connection fanout.
    if (
        result.accepted ==
            true &&
        result.serverState ==
            1
    ) {
        const assignmentQueued =
            emitDeadlockClientAssignmentAfterInGame(
                result.lobbyIdValue
            );

        log(
            "[10025-GS] ready-gated client assignment queued=" +
            assignmentQueued
        );
    }

    // SKYNET_DEADLOCK_TYPE101_POSTMATCH_FANOUT_V1_CALL
    //
    // Official successful lifecycle:
    //
    //   type101 InGame(1)
    //       -> server 10025 PostMatch(2)
    //       -> client 26 type101 PostMatch(2)
    //
    // CacheUnsubscribed is NOT sent here.
    // Existing 10014 successful-signout path sends it later.
    //
    if (
        result.accepted ==
            true &&
        result.serverState ==
            2
    ) {
        const queued =
            emitDeadlockClientLobbyPostMatch(
                result.safeToAbandon ==
                    true,
                result.lobbyIdValue
            );

        log(
            "[10025-GS] client type101 PostMatch queued=" +
            queued
        );
    }

    /*
     * Intentionally no reply().
     *
     * 10025 is Server -> GC lifecycle telemetry.
     */
    return true;
}
