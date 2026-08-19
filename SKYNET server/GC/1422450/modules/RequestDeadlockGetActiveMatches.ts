import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGetActiveMatches,
    CMsgClientToGCGetActiveMatchesResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetActiveMatches",
} as ProtoDescriptor<CMsgClientToGCGetActiveMatches>;

const responseProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetActiveMatchesResponse",
} as ProtoDescriptor<CMsgClientToGCGetActiveMatchesResponse>;

export const RequestDeadlockGetActiveMatchesRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetActiveMatches,

    request: requestProto,

    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetActiveMatchesResponse,

    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetActiveMatches,
    CMsgClientToGCGetActiveMatchesResponse
>;

export function requestDeadlockGetActiveMatches(
    ctx: HandlerContext<
        CMsgClientToGCGetActiveMatches,
        CMsgClientToGCGetActiveMatchesResponse
    >,
): boolean {
    ctx.reply({
        active_matches: [],
    });

    return true;
}
