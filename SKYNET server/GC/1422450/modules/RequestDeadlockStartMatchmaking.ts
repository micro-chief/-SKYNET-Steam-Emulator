import {
    EGCCitadelClientMessages,
    CMsgClientToGCStartMatchmakingResponseEResultCode
} from "../generated/protobuf";

import {
    HandlerContext,
    Route
} from "../framework/gc";

import {
    setDeadlockMatchmakingState
} from "./DeadlockMatchmakingState";

export const RequestDeadlockStartMatchmakingRoute: Route = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartMatchmaking,

    request: {
        name:
            "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartMatchmaking"
    },

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartMatchmakingResponse,

    response: {
        name:
            "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartMatchmakingResponse"
    }
};

export const requestDeadlockStartMatchmaking = (
    ctx: HandlerContext
): void => {
    const request =
        ctx.request;

    const clientVersion =
        request.client_version ??
        0;

    const clientPlatform =
        request.client_platform ??
        0;

    const matchInfo =
        request.match_info;

    // === SKYNET_9010_MATCHMAKING_TRACE_V2_BEGIN ===

    log(
        "[9010] ========================================"
    );

    log(
        "[9010] client_version=" +
        clientVersion
    );

    log(
        "[9010] client_platform=" +
        clientPlatform
    );

    log(
        "[9010] pgi_verified=" +
        (
            request.pgi_verified ??
            false
        )
    );

    if (
        matchInfo
    ) {
        log(
            "[9010] match_info.present=true"
        );

        log(
            "[9010] match_mode=" +
            (
                matchInfo.match_mode ??
                0
            )
        );

        log(
            "[9010] game_mode=" +
            (
                matchInfo.game_mode ??
                0
            )
        );

        log(
            "[9010] bot_difficulty=" +
            (
                matchInfo.bot_difficulty ??
                0
            )
        );

        log(
            "[9010] region_mode=" +
            (
                matchInfo.region_mode ??
                0
            )
        );

        log(
            "[9010] mm_preference=" +
            (
                matchInfo.mm_preference ??
                0
            )
        );

        log(
            "[9010] prefer_solo_only=" +
            (
                matchInfo.prefer_solo_only ??
                false
            )
        );

        log(
            "[9010] server_search_key='" +
            (
                matchInfo.server_search_key ??
                ""
            ) +
            "'"
        );

        log(
            "[9010] server_command_string='" +
            (
                matchInfo.server_command_string ??
                ""
            ) +
            "'"
        );
    }
    else {
        log(
            "[9010] match_info.present=false"
        );
    }

    // === SKYNET_9010_MATCHMAKING_TRACE_V2_END ===

    const pingTimes =
        request.ping_times;

    const heroes =
        request.heroes;

    const pgiVerified =
        request.pgi_verified ??
        false;

    /*
     * Пока намеренно только ACK matchmaking.
     *
     * Следующий этап после подтвержденного
     * Recv 9011:
     *
     *   matchmaking state
     *   -> lobby SO
     *   -> match
     *   -> gameserver
     *   -> SDR
     */

    void clientVersion;
    void clientPlatform;
    void matchInfo;
    void pingTimes;
    void heroes;
    void pgiVerified;

    // SKYNET_9010_ACCOUNT_MATCHMAKING_STATE_V2
    setDeadlockMatchmakingState(
        ctx.accountId,
        true
    );

    log(
        "[9010-STATE] account_id=" +
        ctx.accountId
    );

    log(
        "[9010-STATE] in_matchmaking=true"
    );

    ctx.reply({
        result:
            CMsgClientToGCStartMatchmakingResponseEResultCode
                .k_EResult_OK
    });
};

export const createRequestDeadlockStartMatchmakingHandler =
    () => requestDeadlockStartMatchmaking;

export default requestDeadlockStartMatchmaking;
