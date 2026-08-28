/*
 * Deadlock 1422450
 *
 * RAW GameServer pre-dispatch handler:
 *
 *   10012 CMsgServerToGCMatchSignoutPermission
 *      ->
 *   10013 CMsgServerToGCMatchSignoutPermissionResponse
 *
 * Current official protobuf:
 *
 * message CMsgServerToGCMatchSignoutPermissionResponse {
 *     optional bool can_sign_out = 1;
 *     optional uint32 retry_time_s = 2;
 *     repeated uint32 requested_data = 3;
 * }
 *
 * Minimal success response:
 *
 * field 1, wire type 0:
 *   0x08 0x01
 *
 * Base64:
 *   CAE=
 *
 * IMPORTANT:
 * This handler intentionally does NOT decode 10012.
 * It intentionally does NOT handle 10014.
 */

export function requestDeadlockMatchSignoutPermissionRaw(): boolean {
    if (
        messageType() !=
        10012
    ) {
        return false;
    }

    log(
        "[10012-GS] RAW MatchSignoutPermission received"
    );

    /*
     * CMsgServerToGCMatchSignoutPermissionResponse
     *
     * field 1:
     *   can_sign_out = true
     *
     * protobuf:
     *   08 01
     */
    const response = [
        8,
        1
    ];

    /*
     * reply(
     *     messageType,
     *     raw protobuf bytes,
     *     protobuf = true
     * )
     *
     * The transport will Base64 encode these bytes.
     * Expected BodyBase64:
     *   CAE=
     */
    reply(
        10013,
        response,
        true
    );

    log(
        "[10012-GS] replied 10013 can_sign_out=true bytes=2"
    );

    log(
        "[10012-GS] expected next dedicated message=10014"
    );

    return true;
}
