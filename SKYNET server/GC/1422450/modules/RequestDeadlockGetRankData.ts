import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGetRankData,
    CMsgGCToClientGetRankDataResponse,
    
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "CMsgClientToGCGetRankData",
} as ProtoDescriptor<CMsgClientToGCGetRankData>;

const responseProto = {
    name: "CMsgGCToClientGetRankDataResponse",
} as ProtoDescriptor<CMsgGCToClientGetRankDataResponse>;

export const RequestDeadlockGetRankDataRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetRankData,
    request: requestProto,
    responseId:
        EGCCitadelClientMessages.k_EMsgGCToClientGetRankDataResponse,
    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetRankData,
    CMsgGCToClientGetRankDataResponse
>;

export function requestDeadlockGetRankData(
    ctx: HandlerContext<
        CMsgClientToGCGetRankData,
        CMsgGCToClientGetRankDataResponse
    >,
): boolean {
    ctx.reply({
        result: 0,
        current_rank_confidence: 100,
        calibrated_rank_confidence: 100,
        requires_calibration: false,
    });

    return true;
}
