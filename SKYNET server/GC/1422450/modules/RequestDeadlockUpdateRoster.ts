import {
    CMsgClientToGCUpdateRoster,
    CMsgClientToGCUpdateRosterResponse,
    CMsgClientToGCUpdateRosterResponseEResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCUpdateRoster"
} as ProtoDescriptor<CMsgClientToGCUpdateRoster>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCUpdateRosterResponse"
} as ProtoDescriptor<CMsgClientToGCUpdateRosterResponse>;

export const RequestDeadlockUpdateRosterRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCUpdateRoster,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCUpdateRosterResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCUpdateRoster,
    CMsgClientToGCUpdateRosterResponse
>;

export function requestDeadlockUpdateRoster(
    ctx: any
): boolean {
    const request =
        ctx.request;

    const heroes =
        request.heroes;

    const gameMode =
        request.game_mode ??
        0;

    const matchMode =
        request.match_mode ??
        0;

    void heroes;
    void gameMode;
    void matchMode;

    ctx.reply({
        result:
            CMsgClientToGCUpdateRosterResponseEResponse
                .k_eSuccess
    });

    return true;
}
