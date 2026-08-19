import {
    Route
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
            version: 0n
        }
    );



};

export const createRequestClientHelloHandler =
    () => requestClientHello;

export default requestClientHello;
