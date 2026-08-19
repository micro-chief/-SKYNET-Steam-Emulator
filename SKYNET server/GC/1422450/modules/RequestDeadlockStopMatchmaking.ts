import {
    CMsgClientToGCStopMatchmaking,
    CMsgClientToGCStopMatchmakingResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStopMatchmaking"
} as ProtoDescriptor<CMsgClientToGCStopMatchmaking>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStopMatchmakingResponse"
} as ProtoDescriptor<CMsgClientToGCStopMatchmakingResponse>;

export const RequestDeadlockStopMatchmakingRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStopMatchmaking,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStopMatchmakingResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCStopMatchmaking,
    CMsgClientToGCStopMatchmakingResponse
>;

export function requestDeadlockStopMatchmaking(
    ctx: any
): boolean {
    ctx.reply({
        success:
            true
    });

    return true;
}
