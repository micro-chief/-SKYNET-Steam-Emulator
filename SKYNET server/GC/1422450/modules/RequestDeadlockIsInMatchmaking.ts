import {
    CMsgClientToGCIsInMatchmaking,
    CMsgClientToGCIsInMatchmakingResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

import {
    getDeadlockMatchmakingState
} from "./DeadlockMatchmakingState";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCIsInMatchmaking"
} as ProtoDescriptor<CMsgClientToGCIsInMatchmaking>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCIsInMatchmakingResponse"
} as ProtoDescriptor<CMsgClientToGCIsInMatchmakingResponse>;

export const RequestDeadlockIsInMatchmakingRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCIsInMatchmaking,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCIsInMatchmakingResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCIsInMatchmaking,
    CMsgClientToGCIsInMatchmakingResponse
>;

export function requestDeadlockIsInMatchmaking(
    ctx: any
): boolean {
    // SKYNET_9017_ACCOUNT_MATCHMAKING_STATE_V2

    const inMatchmaking =
        getDeadlockMatchmakingState(
            ctx.accountId
        );

    log(
        "[9017-STATE] account_id=" +
        ctx.accountId
    );

    if (
        inMatchmaking
    ) {
        log(
            "[9017-STATE] in_matchmaking=true"
        );
    }
    else {
        log(
            "[9017-STATE] in_matchmaking=false"
        );
    }

    ctx.reply({
        in_matchmaking:
            inMatchmaking
    });

    return true;
}
