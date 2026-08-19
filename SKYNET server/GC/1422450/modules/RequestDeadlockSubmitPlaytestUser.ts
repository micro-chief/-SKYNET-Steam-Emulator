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
    ctx: any
): boolean {
    // === SKYNET_SUBMIT_PLAYTEST_USER_9189_V1 ===

    const targetAccountId =
        ctx.request.target_account_id ??
        0;

    const location =
        ctx.request.location ??
        "";

    log(
        "[9189] target_account_id=" +
        targetAccountId
    );

    log(
        "[9189] location='" +
        location +
        "'"
    );

    /*
     * Official capture response is two protobuf bytes.
     *
     *   08 01
     *
     * -> response = 1
     *
     * Treat as successful local submission.
     */
    ctx.reply({
        response:
            1
    });

    log(
        "[9189] response=1"
    );

    return true;
}
