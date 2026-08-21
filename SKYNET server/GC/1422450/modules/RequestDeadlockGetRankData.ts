import { HandlerContext,
    encodeProto
} from "../framework/gc";

// SKYNET_FIX_GETRANKDATA_ENCODEPROTO_IMPORT_V1
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
    // SKYNET_RANK_DATA_OFFICIAL_CAPTURE_V1
    ctx.reply({
        result:
            0,

        current_rank_confidence:
            100,

        calibrated_rank_confidence:
            100,

        requires_calibration:
            false
    });

    // === SKYNET_DEV_PLAYTEST_STATUS_9019_V1_BEGIN ===

    const playtestStatus: any = {
        dev_queue_size: [
            {
                match_mode:
                    1,

                queue_size:
                    1,

                game_mode:
                    1
            },
            {
                match_mode:
                    1,

                queue_size:
                    1,

                game_mode:
                    4
            },
            {
                match_mode:
                    3,

                queue_size:
                    1,

                game_mode:
                    1
            },
            {
                match_mode:
                    4,

                queue_size:
                    1,

                game_mode:
                    1
            }
        ],

        dev_available_servers:
            1,

        coop_bot_max_wait_s:
            300,

        is_mm_enabled:
            true,

        locked_heroes:
            false,

        party_shared_heroes:
            false,

        mm_pause_time:
            0,

        valid_client_versions: [
            6677
        ],

        active_match_count:
            0,

        roster_non_limited_heroes:
            0,

        matches_per_priority_token:
            1,

        active_ranked_modes: [
            {
                rank_type:
                    1,

                rank_interval:
                    1,

                leaderboard_tiers:
                    []
            }
        ]
    };

    // SKYNET_RANKED_INTERVAL_SYNC_9019_V1
    log(
        "[9019-RANKED] rank_type=1 rank_interval=1"
    );

    log(
        "[9019] ========================================"
    );

    log(
        "[9019] is_mm_enabled=true"
    );

    log(
        "[9019] valid_client_version=6677"
    );

    log(
        "[9019] queues=UnrankedNormal,StreetBrawl,CoopBot,Ranked"
    );

    ctx.send(
        9019,
        "SKYNET.Server.GameCoordinator.Citadel.CMsgGCToClientDevPlaytestStatus",
        playtestStatus
    );

    log(
        "[9019] send complete"
    );

    /*
     * ============================================================
     * CSOGameAccountClient
     *
     * SO type_id = 107
     * owner      = SteamID / owner type 1
     *
     * Ranked unlock experiment:
     *
     *   wins        = 100
     *   losses      = 50
     *   permissions = 0
     *
     * permissions is intentionally kept at zero.
     * We are testing whether the current client requires the
     * account-level win count independently from Party ranked state.
     * ============================================================
     */

    

    // === SKYNET_DEV_PLAYTEST_STATUS_9019_V1_END ===


    return true;
}
