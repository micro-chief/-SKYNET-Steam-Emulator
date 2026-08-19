import {
    CMsgClientToGCIsInMatchmaking,
    CMsgClientToGCIsInMatchmakingResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

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
    /*
     * Temporary state until DB-backed matchmaking session storage
     * is implemented.
     *
     * For now the client must remain in matchmaking after 9010.
     */

    ctx.reply({
        in_matchmaking:
            true
    });

    return true;
}
