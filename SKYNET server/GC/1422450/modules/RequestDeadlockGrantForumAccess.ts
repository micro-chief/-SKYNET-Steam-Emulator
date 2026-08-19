import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGrantForumAccess,
    CMsgClientToGCGrantForumAccessResponse,
    
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "CMsgClientToGCGrantForumAccess",
} as ProtoDescriptor<CMsgClientToGCGrantForumAccess>;

const responseProto = {
    name: "CMsgClientToGCGrantForumAccessResponse",
} as ProtoDescriptor<CMsgClientToGCGrantForumAccessResponse>;

export const RequestDeadlockGrantForumAccessRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGrantForumAccess,
    request: requestProto,
    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCGrantForumAccessResponse,
    response: responseProto,
} as GcRoute<
    CMsgClientToGCGrantForumAccess,
    CMsgClientToGCGrantForumAccessResponse
>;

export function requestDeadlockGrantForumAccess(
    ctx: HandlerContext<
        CMsgClientToGCGrantForumAccess,
        CMsgClientToGCGrantForumAccessResponse
    >,
): boolean {
    ctx.reply({
        response: 3,
    });

    return true;
}
