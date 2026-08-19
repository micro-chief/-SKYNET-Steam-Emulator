import { HandlerContext } from "../framework/gc";
import {
    CMsgClientToGCGetFriendGameStatus,
    CMsgClientToGCGetFriendGameStatusResponse,
    
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetFriendGameStatus",
} as ProtoDescriptor<CMsgClientToGCGetFriendGameStatus>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetFriendGameStatusResponse",
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
    ctx: any
): boolean {
    // === SKYNET_FRIEND_GAME_STATUS_9213_V1 ===

    const includeInvited =
        ctx.request.include_invited ??
        false;

    log(
        "[9213] include_invited=" +
        includeInvited
    );

    /*
     * Official NetHook request is:
     *
     *   08 01
     *
     * -> field 1 / include_invited = true
     *
     * Response enum:
     *   k_eSuccess = 1
     *
     * We intentionally return empty eligibility arrays for now.
     * SteamFriends still supplies the actual friend identities.
     *
     * Once the user clicks a concrete friend we capture the NEXT
     * GC message; that is the actual invite operation.
     */
    ctx.reply({
        response:
            1,

        friends_played_game:
            [],

        friends_invited:
            [],

        friends_invites_sent:
            []
    });

    return true;
}
