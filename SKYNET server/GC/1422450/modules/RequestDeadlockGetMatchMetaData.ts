import { HandlerContext } from "../framework/gc";

import {
    CMsgClientToGCGetMatchMetaData,
    CMsgClientToGCGetMatchMetaDataResponse,
    CMsgClientToGCGetMatchMetaDataResponse_EResult,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetMatchMetaData",
} as ProtoDescriptor<CMsgClientToGCGetMatchMetaData>;

const responseProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetMatchMetaDataResponse",
} as ProtoDescriptor<CMsgClientToGCGetMatchMetaDataResponse>;

export const RequestDeadlockGetMatchMetaDataRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetMatchMetaData,

    request: requestProto,

    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetMatchMetaDataResponse,

    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetMatchMetaData,
    CMsgClientToGCGetMatchMetaDataResponse
>;

export function requestDeadlockGetMatchMetaData(
    ctx: HandlerContext<
        CMsgClientToGCGetMatchMetaData,
        CMsgClientToGCGetMatchMetaDataResponse
    >,
): boolean {
    const request = ctx.request;

    /*
     * We do not have persisted replay metadata yet.
     *
     * Return a structurally valid successful response so the client can
     * continue its metadata flow. Preserve metadata_salt when supplied.
     *
     * Once deadlock.db is added, replay_salt/group/valid-through can be
     * populated from the stored match record.
     */
    ctx.reply({
        result:
            CMsgClientToGCGetMatchMetaDataResponse_EResult
                .k_eResult_Success,

        replay_salt: 0,
        metadata_salt: request.metadata_salt ?? 0,
        replay_valid_through: 0,
        replay_group_id: 0,
        replay_processing_through: 0,
    });

    return true;
}
