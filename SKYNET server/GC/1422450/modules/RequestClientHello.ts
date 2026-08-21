import {
    Route,
    encodeProto
} from "../framework/gc";

export const ClientHelloRoute: Route = {
    requestId: 4006,
    request: {
        name: "CMsgClientHello"
    },
    responseId: 4004,
    response: {
        name: "CMsgClientWelcome"
    }
};

function firstCache(
    request: any
): any {
    const caches =
        request.socache_have_versions ?? [];

    if (caches.length > 0) {
        return caches[0];
    }

    return null;
}

function serviceCache(
    request: any,
    serviceId: number
): any {
    const caches =
        request.socache_have_versions ?? [];

    for (
        let i = 0;
        i < caches.length;
        i++
    ) {
        const cache =
            caches[i];

        if (
            (cache.service_id ?? 0) ===
            serviceId
        ) {
            return cache;
        }
    }

    return null;
}

export const requestClientHello =
(
    ctx: any
): void => {
    const request =
        ctx.request;

    // === SKYNET_CLIENTHELLO_SOID_DIAGNOSTICS_BEGIN ===

    const diagnosticCaches =
        request.socache_have_versions ??
        [];

    // SKYNET_DEADLOCK_AUTO_ENSURE_PLAYER_V4_FIXED
    const deadlockPlayerReady =
        deadlockEnsurePlayer(
            ctx.accountId
        );

    log(
        "[4006-DB] EnsurePlayer=" +
        deadlockPlayerReady
    );

    log(
        "[4006-SOID] ===== ClientHello SO caches ====="
    );

    log(
        "[4006-SOID] steam_id=" +
        ctx.steamId
    );

    log(
        "[4006-SOID] account_id=" +
        ctx.accountId
    );

    log(
        "[4006-SOID] cache_count=" +
        diagnosticCaches.length
    );

    for (
        let diagnosticIndex = 0;
        diagnosticIndex < diagnosticCaches.length;
        diagnosticIndex++
    ) {
        const diagnosticCache =
            diagnosticCaches[
                diagnosticIndex
            ];

        log(
            "[4006-SOID] cache[" +
            diagnosticIndex +
            "].service_id=" +
            (
                diagnosticCache.service_id ??
                -1
            )
        );

        log(
            "[4006-SOID] cache[" +
            diagnosticIndex +
            "].version=" +
            (
                diagnosticCache.version ??
                0
            )
        );

        const diagnosticSoid =
            diagnosticCache.soid;

        log(
            "[4006-SOID] cache[" +
            diagnosticIndex +
            "].soid.present=" +
            (
                diagnosticSoid !=
                undefined
            )
        );

        if (
            diagnosticSoid !=
            undefined
        ) {
            log(
                "[4006-SOID] cache[" +
                diagnosticIndex +
                "].soid.type=" +
                (
                    diagnosticSoid.type ??
                    -1
                )
            );

            log(
                "[4006-SOID] cache[" +
                diagnosticIndex +
                "].soid.id=" +
                (
                    diagnosticSoid.id ??
                    0
                )
            );
        }
    }

    log(
        "[4006-SOID] ===== end SO caches ====="
    );

    // === SKYNET_CLIENTHELLO_SOID_DIAGNOSTICS_END ===


    const cache0 =
        serviceCache(
            request,
            0
        ) ??
        firstCache(
            request
        );

    const cache1 =
        serviceCache(
            request,
            1
        ) ??
        cache0;

    // -------------------------------------------------------------------------
    // 4009 - client is leaving the GC logon queue.
    // -------------------------------------------------------------------------

    ctx.send(
        4009,
        "CMsgConnectionStatus",
        {
            status: 3,
        }
    );

    // -------------------------------------------------------------------------
    // 4004 - normal GC welcome.
    // -------------------------------------------------------------------------

    const welcome: any = {
            uptodate_subscribed_caches: [
                {
                    version:
                        29976381286312925n,

                    owner_soid: {
                        type:
                            1,

                        id:
                            ctx.steamId
                    },

                    service_list: [
                        1
                    ],

                    sync_version:
                        29982419028691867n
                }
            ],
        version:
            request.version ?? 1
    };

    if (cache0 !== null) {
        welcome.uptodate_subscribed_caches = [
            {
                version:
                    cache0.version ?? 0n,

                owner_soid: {
                    type:
                        cache0.soid?.type ??
                        1,

                    id:
                        cache0.soid?.id ??
                        ctx.steamId
                },

                service_list: [
                    1
                ],

                sync_version:
                    cache0.version ??
                    0n
            }
        ];
    }

            // SKYNET_SOCACHE_BOOTSTRAP_V4_FIXED
    //
    // Force the captured account-cache revisions AFTER the
    // optional cache0 override above.
    welcome.uptodate_subscribed_caches = [
        {
            version:
                29976381286312925n,

            owner_soid: {
                type:
                    1,

                id:
                    ctx.steamId
            },

            service_list: [
                1
            ],

            sync_version:
                29982419028691867n
        }
    ];

// SKYNET_ACCOUNT_SOCACHE_BOOTSTRAP_RANKED_V3_INLINE_CONSTANTS
    /*
     * TypeSharp-safe account SO bootstrap.
     *
     * Official Ranked-ready capture revisions are deliberately
     * inlined in protobuf payloads below. Do not move them into local
     * variables: TypeSharp may compile payload object construction in
     * a separate generated scope.
     */
    log(
        "[ACCOUNT-SO] bootstrap V3 inline revisions owner.type=1"
    );

    log(
        "[ACCOUNT-SO] bootstrap owner.id=" +
        ctx.steamId
    );

    ctx.send(
        4004,
        "CMsgClientWelcome",
        welcome
    );

    // -------------------------------------------------------------------------
    // 29 - SO cache bootstrap.
    //
    // Do NOT make this conditional on service 1 being present.
    // Some local ClientHello packets do not contain the same service layout
    // as the captured Steam session.
    // -------------------------------------------------------------------------

    const cache =
        cache1 ??
        cache0;

    ctx.send(
        29,
        "CMsgSOCacheSubscribedUpToDate",
        {
            version:
                29976381286312925n,

            owner_soid: {
                type:
                    1,

                id:
                    ctx.steamId
            },

            service_id:
                1,

            service_list: [
                0
            ],

            sync_version:
                29982419028691867n
        }
    );

    const rankedHero14 =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOAccountHeroInfo",
            {
                account_id:
                    ctx.accountId,

                hero_id:
                    14,

                status:
                    0,

                wins:
                    20,

                hero_xp:
                    0,

                brawl_wins:
                    0
            }
        );

    const rankedHero63 =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOAccountHeroInfo",
            {
                account_id:
                    ctx.accountId,

                hero_id:
                    63,

                status:
                    0,

                wins:
                    20,

                hero_xp:
                    0,

                brawl_wins:
                    0
            }
        );

    const rankedHero64 =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOAccountHeroInfo",
            {
                account_id:
                    ctx.accountId,

                hero_id:
                    64,

                status:
                    0,

                wins:
                    20,

                hero_xp:
                    0,

                brawl_wins:
                    0
            }
        );

        // SKYNET_RANKED_PROGRESS_TYPE112_BOOTSTRAP_V1
    const rankedProgress =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSORankedProgress",
            {
                account_id:
                    ctx.accountId,

                rank_type:
                    1,

                rank_interval:
                    1,

                progress:
                    60,

                max_progress:
                    60,

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
                    60,

                last_match_hero_id:
                    64,

                last_match_outcome:
                    1
            }
        );

    log(
        "[ACCOUNT-SO] type112 match_count=60 progress=60/60"
    );

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
                },

                {
                    type_id:
                        107,

                    object_data:
                        rankedHero14
                },

                {
                    type_id:
                        107,

                    object_data:
                        rankedHero63
                },

                {
                    type_id:
                        107,

                    object_data:
                        rankedHero64
                }
            ],

            objects_added:
                [],

            objects_removed:
                [],

            version:
                174096126775304347n,

            owner_soid: {
                type:
                    1,

                id:
                    ctx.steamId
            },

            service_id:
                1
        }
    );

    log(
        "[ACCOUNT-SO] send 26 type107 objects=3"
    );

    log(
        "[ACCOUNT-SO] hero14 wins=20"
    );

    log(
        "[ACCOUNT-SO] hero63 wins=20"
    );

    log(
        "[ACCOUNT-SO] hero64 wins=20"
    );




};

export const createRequestClientHelloHandler =
    () => requestClientHello;

export default requestClientHello;
