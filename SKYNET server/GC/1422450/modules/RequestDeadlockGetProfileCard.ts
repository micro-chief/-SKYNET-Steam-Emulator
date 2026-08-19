import { HandlerContext } from "../framework/gc";
import {
    CMsgCitadelProfileCard,
    CMsgClientToGCGetProfileCard,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetProfileCard",
} as ProtoDescriptor<CMsgClientToGCGetProfileCard>;

const responseProto = {
    name: "SKYNET.Server.GameCoordinator.Citadel.CMsgCitadelProfileCard",
} as ProtoDescriptor<CMsgCitadelProfileCard>;

export const RequestDeadlockGetProfileCardRoute = {
    requestId: 9024,
    request: requestProto,
    responseId: 9025,
    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetProfileCard,
    CMsgCitadelProfileCard
>;

export function requestDeadlockGetProfileCard(
    ctx: HandlerContext<
        CMsgClientToGCGetProfileCard,
        CMsgCitadelProfileCard
    >,
): boolean {
    const accountId =
        ctx.request.account_id ?? 0;

    ctx.reply({
        account_id: accountId,
        slots: [],
        ranked_badge_level: 0,
    });

    return true;
}
