const GS_REQUEST_PLAYER_HERO_DATA =
    10044;

const GS_REQUEST_PLAYER_HERO_DATA_RESPONSE =
    10045;

/*
 * CMsgServerToGCRequestPlayerHeroData:
 *
 *   uint32 account_id = 1;
 *   uint32 hero_id    = 2;
 *
 * We deliberately DO NOT decode the request yet.
 *
 * V1 goal:
 * prove the request/reply path and eliminate the
 * dedicated server's 5 second timeout.
 *
 * CMsgServerToGCRequestPlayerHeroDataResponse:
 *
 *   result    field 1 = k_eSuccess (1)
 *   hero_data field 2 = empty message
 *
 * Wire:
 *
 *   08 01 12 00
 */
export function requestDeadlockPlayerHeroDataRaw(): boolean {
    if (
        messageType() != GS_REQUEST_PLAYER_HERO_DATA
    ) {
        return false;
    }

    log(
        "[10044-GS] ========================================"
    );

    log(
        "[10044-GS] RAW RequestPlayerHeroData received"
    );

    log(
        "[10044-GS] server steamId=" +
        steamId()
    );

    const response = [
        8,
        1,
        18,
        0
    ];

    /*
     * reply() rather than send():
     * if 10044 carries SourceJobId the host automatically
     * returns it as TargetJobId on 10045.
     */
    reply(
        GS_REQUEST_PLAYER_HERO_DATA_RESPONSE,
        response,
        true
    );

    log(
        "[10044-GS] replied 10045 result=SUCCESS hero_data=EMPTY"
    );

    log(
        "[10044-GS] wire=08 01 12 00"
    );

    return true;
}
