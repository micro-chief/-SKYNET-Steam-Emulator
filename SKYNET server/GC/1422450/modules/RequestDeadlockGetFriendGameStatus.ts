import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGetFriendGameStatus,
    CMsgClientToGCGetFriendGameStatusResponse,
    
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "CMsgClientToGCGetFriendGameStatus",
} as ProtoDescriptor<CMsgClientToGCGetFriendGameStatus>;

const responseProto = {
    name: "CMsgClientToGCGetFriendGameStatusResponse",
} as ProtoDescriptor<CMsgClientToGCGetFriendGameStatusResponse>;

export const RequestDeadlockGetFriendGameStatusRoute = {
    requestId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetFriendGameStatus,
    request: requestProto,
    responseId:
        EGCCitadelClientMessages.k_EMsgClientToGCGetFriendGameStatusResponse,
    response: responseProto,
} as GcRoute<
    CMsgClientToGCGetFriendGameStatus,
    CMsgClientToGCGetFriendGameStatusResponse
>;

export function requestDeadlockGetFriendGameStatus(
    ctx: HandlerContext<
        CMsgClientToGCGetFriendGameStatus,
        CMsgClientToGCGetFriendGameStatusResponse
    >,
): boolean {
    ctx.reply({
        response: 1,
        friends_played_game: [],
        friends_invited: [],
        friends_invites_sent: [],
    });

    return true;
}
