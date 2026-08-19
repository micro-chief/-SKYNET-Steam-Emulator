import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGetMatchHistory,
    CMsgClientToGCGetMatchHistoryResponse,
    
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "CMsgClientToGCGetMatchHistory",
} as ProtoDescriptor<CMsgClientToGCGetMatchHistory>;

const responseProto = {
    name: "CMsgClientToGCGetMatchHistoryResponse",
} as ProtoDescriptor<CMsgClientToGCGetMatchHistoryResponse>;

export const RequestDeadlockGetMatchHistoryRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetMatchHistory,
    request: requestProto,
    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetMatchHistoryResponse,
    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetMatchHistory,
    CMsgClientToGCGetMatchHistoryResponse
>;

export function requestDeadlockGetMatchHistory(
    ctx: HandlerContext<
        CMsgClientToGCGetMatchHistory,
        CMsgClientToGCGetMatchHistoryResponse
    >,
): boolean {
    ctx.reply({
        result: 1,
        continue_cursor: 0n,
        matches: [],
    });

    return true;
}
