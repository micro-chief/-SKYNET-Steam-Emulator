import {
    Route,
    encodeProto
} from "../framework/gc";

// SKYNET_DEADLOCK_RANKED_DB_ROUTE_V1

export const SOCacheSubscriptionRefreshRoute: Route = {
    requestId:
        28,

    request: {
        name:
            "CMsgSOCacheSubscriptionRefresh"
    },

    responseId:
        24,

    response: {
        name:
            "CMsgSOCacheSubscribed"
    }
};

const STEAM_ID64_INDIVIDUAL_BASE =
    76561197960265728n;

export function requestSOCacheSubscriptionRefresh(
    ctx: any
): boolean {
    const request =
        ctx.request;

    const owner =
        request.owner_soid;

    log(
        "[28-RANKED-DB] request"
    );

    if (
        owner == undefined ||
        owner == null
    ) {
        log(
            "[28-RANKED-DB] owner missing"
        );

        ctx.reply({
            version:
                29976381286312925n,

            service_id:
                0,

            service_list: [
                0
            ],

            sync_version:
                29982419028691867n
        });

        return true;
    }

    /*
     * Keep exact protobuf SteamID64.
     *
     * ctx.accountId may travel through signed Int32 and
     * ctx.steamId may lose JS integer precision.
     */
    const accountId =
        owner.id -
        STEAM_ID64_INDIVIDUAL_BASE;

    log(
        "[28-RANKED-DB] owner.type=" +
        owner.type
    );

    log(
        "[28-RANKED-DB] owner.id=" +
        owner.id
    );

    log(
        "[28-RANKED-DB] accountId=" +
        accountId
    );

    /*
     * Typed host bridge:
     *
     * PlayerStats -> normalWins
     * HeroStats   -> heroes[]
     * RankedState -> ranked{}
     */
    const db =
        deadlockRankedSocache(
            accountId
        );

    if (
        db == undefined ||
        db == null
    ) {
        log(
            "[28-RANKED-DB] snapshot missing"
        );

        return false;
    }

    /*
     * SKYNET_DEADLOCK_GAME_ACCOUNT_TYPE104_V2
     *
     * client.dll RTTI:
     *
     * CProtoBufSharedObject<
     *     CSOGameAccountClient,
     *     0x68
     * >
     *
     * 0x68 = 104.
     *
     * First clean eligibility test:
     *
     *   account_id <- exact accountId from owner.id
     *   wins       <- PlayerStats.Wins
     */
    const accountWins =
        db.normalWins ?? 0;

    const gameAccount =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOGameAccountClient",
            {
                account_id:
                    accountId,

                wins:
                    accountWins
            }
        );

    log(
        "[24-GAME-ACCOUNT] type104 account_id=" +
        accountId
    );

    log(
        "[24-GAME-ACCOUNT] type104 wins=" +
        accountWins
    );


    const heroes =
        db.heroes ?? [];

    const heroPayloads: any[] =
        [];
for (
        let index = 0;
        index < heroes.length;
        index++
    ) {
        const hero =
            heroes[index];

        const heroId =
            hero.heroId ?? 0;

        if (
            heroId == 0
        ) {
            continue;
        }

        const payload =
            encodeProto(
                "SKYNET.Server.GameCoordinator.Citadel.CSOAccountHeroInfo",
                {
                    account_id:
                        accountId,

                    hero_id:
                        heroId,

                    status:
                        0,

                    wins:
                        hero.wins ?? 0,

                    hero_xp:
                        hero.heroXp ?? 0,

                    brawl_wins:
                        hero.brawlWins ?? 0
                }
            );

        heroPayloads.push(
            payload
        );
    }
const ranked =
        db.ranked;

    if (
        ranked == undefined ||
        ranked == null
    ) {
        log(
            "[28-RANKED-DB] ranked state missing"
        );

        return false;
    }

    const rankedProgress =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSORankedProgress",
            {
                account_id:
                    accountId,

                rank_type:
                    ranked.rankType ?? 0,

                rank_interval:
                    ranked.rankInterval ?? 0,

                progress:
                    ranked.progress ?? 0,

                max_progress:
                    ranked.maxProgress ?? 0,

                rank:
                    ranked.rank ?? 0,

                max_rank:
                    ranked.maxRank ?? 0,

                leaderboard_rank:
                    ranked.leaderboardRank ?? 0,

                max_leaderboard_rank:
                    ranked.maxLeaderboardRank ?? 0,

                demote_protect_games:
                    ranked.demoteProtectGames ?? 0,

                calibrate_games:
                    ranked.calibrateGames ?? 0,

                win_bit_mask:
                    ranked.winBitMask ?? 0,

                match_count:
                    ranked.matchCount ?? 0,

                last_match_hero_id:
                    ranked.lastMatchHeroId ?? 0,

                last_match_outcome:
                    ranked.lastMatchOutcome ?? 0
            }
        );

    /*
     * Exact working full-account-cache envelope.
     *
     * type 107 -> HeroStats DB
     * type 112 -> RankedState DB
     */
    const cache = {
        objects: [
            {
                type_id:
                    104,

                object_data: [
                    gameAccount
                ]
            },
            {
                type_id:
                    107,

                object_data:
                    heroPayloads
            },
            {
                type_id:
                    112,

                object_data: [
                    rankedProgress
                ]
            }
        ],

        version:
            29976381286312925n,

        owner_soid: {
            type:
                1,

            id:
                owner.id
        },

        service_id:
            0,

        service_list: [
            0
        ],

        sync_version:
            29982419028691867n
    };

    log(
        "[24-RANKED-DB] heroes=" +
        heroPayloads.length
    );

    log(
        "[24-RANKED-DB] normalWins=" +
        db.normalWins
    );

    log(
        "[24-RANKED-DB] rankType=" +
        ranked.rankType
    );

    log(
        "[24-RANKED-DB] rankInterval=" +
        ranked.rankInterval
    );

    log(
        "[24-RANKED-DB] calibrateGames=" +
        ranked.calibrateGames
    );

    log(
        "[24-RANKED-DB] matchCount=" +
        ranked.matchCount
    );

    log(
        "[24-GAME-ACCOUNT] objects=104,107,112"
    );


    ctx.reply(
        cache
    );

    log(
        "[24-RANKED-DB] full account cache sent"
    );

    return true;
}
