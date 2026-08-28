import { encodeProto } from "../framework/gc";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

// SKYNET_DEADLOCK_EPHEMERAL_MATCH_LOBBY_V1_10023
import {
    getCurrentDeadlockMatchId,
    getCurrentDeadlockMatchLobbyId
} from "./DeadlockMatchLobbyState";

const GS_ENTER_MATCHMAKING =
    10023;

const GS_ALLOCATE_FOR_MATCH =
    10021;

let lastAllocatedServerSteamId =
    0n;

let lastAllocatedMatchId =
    0n;

/*
 * V5.3 IMPORTANT:
 *
 * This handler is NOT registered through gc.on().
 * main.ts calls it BEFORE gc.dispatch().
 *
 * Therefore the unknown 10023 protobuf body is NEVER
 * passed through GameCoordinatorProtoCodec.Decode().
 */
export function requestDeadlockServerEnterMatchmakingRaw(): boolean {
    if (
        messageType() != GS_ENTER_MATCHMAKING
    ) {
        return false;
    }

    const serverSteamId =
        steamId();

    log(
        "[10023-GS] ========================================"
    );

    log(
        "[10023-GS] RAW EnterMatchmaking received"
    );

    log(
        "[10023-GS] steamId=" +
        serverSteamId
    );

        // SKYNET_10023_SUPERVISED_ONLY_GUARD_V1
        // The client dl_hideout listen server also performs 4007 -> 10023.
        // Never allocate the active match to it. The supervisor-owned
        // dedicated SteamID is the only identity allowed past this point.
        const sky10023SupervisedDedicated =
            deadlockIsDedicatedGameServer(
                steamId()
            );

        if (!sky10023SupervisedDedicated) {
            log("[10023-GS-GUARD] supervised=false");
            log("[10023-GS-GUARD] REJECT non-supervised/listen GameServer");
            log("[10023-GS-GUARD] 10021 suppressed");
            return true;
        }

        log("[10023-GS-GUARD] supervised=true");

    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
        log(
            "[10023-GS] SKIP: no current Deadlock party"
        );

        return true;
    }

    const lobbyId =
        getCurrentDeadlockMatchLobbyId();

    const matchId =
        getCurrentDeadlockMatchId();

    if (
        lobbyId == 0n ||
        matchId == 0n
    ) {
        log(
            "[10023-GS] SKIP: lobby_id or match_id is zero"
        );

        return true;
    }

    const reservation: any =
        deadlockDedicatedServerState(
            lobbyId
        );

    if (
        reservation == null ||
        reservation.found != true ||
        reservation.gameServerSteamId !==
            serverSteamId
    ) {
        log(
            "[10023-GS] SKIP reservation owner mismatch match_id=" +
            matchId +
            " lobby_id=" +
            lobbyId +
            " sender=" +
            serverSteamId +
            " reserved=" +
            (reservation == null ? 0n : reservation.gameServerSteamId)
        );
        return true;
    }

    log(
        "[10023-GS] lobby_id=" +
        lobbyId +
        " match_id=" +
        matchId
    );

    if (
        lastAllocatedServerSteamId == serverSteamId &&
        lastAllocatedMatchId == matchId
    ) {
        log(
            "[10023-GS] duplicate readiness; 10021 already sent"
        );

        return true;
    }

    /*
     * CMsgGCToServerAllocateForMatch:
     *
     *     uint64 match_id = 1;
     *
     * CMsgClientToGCGetMatchMetaData has the same
     * field #1 uint64 wire representation.
     *
     * V4 already proved this encoder produces a
     * valid 10021 accepted by the Deadlock parser.
     */
    const payload =
        encodeProto(
            "CMsgClientToGCGetMatchMetaData",
            {
                match_id:
                    matchId
            }
        );

    send(
        GS_ALLOCATE_FOR_MATCH,
        payload,
        true
    );

    lastAllocatedServerSteamId =
        serverSteamId;

    lastAllocatedMatchId =
        matchId;

    log(
        "[10023-GS] readiness accepted"
    );

    log(
        "[10023-GS] queued raw 10021 AllocateForMatch"
    );

    log(
        "[10023-GS] sequence=10023->10021"
    );

    return true;
}
