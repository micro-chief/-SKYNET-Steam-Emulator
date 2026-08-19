import {
    EGCCitadelClientMessages,
    CMsgClientToGCStartMatchmakingResponseEResultCode
} from "../generated/protobuf";

import {
    HandlerContext,
    Route
} from "../framework/gc";

export const RequestDeadlockStartMatchmakingRoute: Route = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartMatchmaking,

    request: {
        name:
            "CMsgClientToGCStartMatchmaking"
    },

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartMatchmakingResponse,

    response: {
        name:
            "CMsgClientToGCStartMatchmakingResponse"
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

    ctx.reply({
        result:
            CMsgClientToGCStartMatchmakingResponseEResultCode
                .k_EResult_OK,

        debug_message:
            "SKYNET matchmaking accepted"
    });
};

export const createRequestDeadlockStartMatchmakingHandler =
    () => requestDeadlockStartMatchmaking;

export default requestDeadlockStartMatchmaking;
