import {
    encodeProto
} from "../framework/gc";

import {
    CMsgClientToGCStartRankedInterval,
    CMsgClientToGCStartRankedIntervalResponse,
    CMsgClientToGCStartRankedIntervalResponseEResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartRankedInterval"
} as ProtoDescriptor<CMsgClientToGCStartRankedInterval>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartRankedIntervalResponse"
} as ProtoDescriptor<CMsgClientToGCStartRankedIntervalResponse>;

export const RequestDeadlockStartRankedIntervalRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartRankedInterval,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartRankedIntervalResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCStartRankedInterval,
    CMsgClientToGCStartRankedIntervalResponse
>;

export function requestDeadlockStartRankedInterval(
    ctx: any
): boolean {
    const rankType =
        ctx.request.rank_type ??
        0;

    const interval =
        ctx.request.interval ??
        0;

    const rankedProgress =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSORankedProgress",
            {
                account_id:
                    ctx.accountId,

                rank_type:
                    rankType,

                rank_interval:
                    interval,

                progress:
                    0,

                max_progress:
                    1,

                rank:
                    0,

                max_rank:
                    0,

                leaderboard_rank:
                    0,

                max_leaderboard_rank:
                    0,

                demote_protect_games:
                    0,

                calibrate_games:
                    0,

                win_bit_mask:
                    0,

                match_count:
                    0,

                last_match_hero_id:
                    0,

                last_match_outcome:
                    0
            }
        );

    // Captured before 9290:
    //
    // 26 SOCacheUpdated
    // owner=SteamID owner type=1
    // SO type=112

    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        {
            objects_modified: [
                {
                    type_id:
                        112,

                    object_data:
                        rankedProgress
                }
            ],

            version:
                1n,

            owner_soid: {
                type:
                    1,

                id:
                    ctx.steamId
            },

            service_id:
                0
        }
    );

    ctx.reply({
        response:
            CMsgClientToGCStartRankedIntervalResponseEResponse
                .k_eSuccess
    });

    return true;
}
