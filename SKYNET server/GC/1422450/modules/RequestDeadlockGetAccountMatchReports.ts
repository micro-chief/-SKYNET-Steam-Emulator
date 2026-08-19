import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGetAccountMatchReports,
    CMsgClientToGCGetAccountMatchReportsResponse,
    
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "CMsgClientToGCGetAccountMatchReports",
} as ProtoDescriptor<CMsgClientToGCGetAccountMatchReports>;

const responseProto = {
    name: "CMsgClientToGCGetAccountMatchReportsResponse",
} as ProtoDescriptor<CMsgClientToGCGetAccountMatchReportsResponse>;

export const RequestDeadlockGetAccountMatchReportsRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetAccountMatchReports,
    request: requestProto,
    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetAccountMatchReportsResponse,
    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetAccountMatchReports,
    CMsgClientToGCGetAccountMatchReportsResponse
>;

export function requestDeadlockGetAccountMatchReports(
    ctx: HandlerContext<
        CMsgClientToGCGetAccountMatchReports,
        CMsgClientToGCGetAccountMatchReportsResponse
    >,
): boolean {
    ctx.reply({
        response: 1,
        reports: [],
        commends: [],
    });

    return true;
}
