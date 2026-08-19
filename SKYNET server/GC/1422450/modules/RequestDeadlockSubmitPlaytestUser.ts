import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCSubmitPlaytestUser,
    CMsgClientToGCSubmitPlaytestUserResponse,
    CMsgClientToGCSubmitPlaytestUserResponseEResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCSubmitPlaytestUser",
} as ProtoDescriptor<CMsgClientToGCSubmitPlaytestUser>;

const responseProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCSubmitPlaytestUserResponse",
} as ProtoDescriptor<CMsgClientToGCSubmitPlaytestUserResponse>;

export const RequestDeadlockSubmitPlaytestUserRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCSubmitPlaytestUser,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCSubmitPlaytestUserResponse,

    response:
        responseProto,
} as GcRoute<
    CMsgClientToGCSubmitPlaytestUser,
    CMsgClientToGCSubmitPlaytestUserResponse
>;

export function requestDeadlockSubmitPlaytestUser(
    ctx: HandlerContext<
        CMsgClientToGCSubmitPlaytestUser,
        CMsgClientToGCSubmitPlaytestUserResponse
    >,
): boolean {
    const location =
        ctx.request.location ?? "";

    const targetAccountId =
        ctx.request.target_account_id ?? 0;

    void location;
    void targetAccountId;

    ctx.reply({
        response:
            CMsgClientToGCSubmitPlaytestUserResponseEResponse.eResponse_Success,
    });

    return true;
}
