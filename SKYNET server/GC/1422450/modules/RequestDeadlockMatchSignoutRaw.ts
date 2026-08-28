// SKYNET_DEADLOCK_CLIENT_POSTGAME_CLEANUP_V1_IMPORT
import {
    emitDeadlockClientPostGameCleanup
} from "./DeadlockClientAssignment";

/*
 * Deadlock 1422450
 *
 * RAW GameServer pre-dispatch:
 *
 *   10014 CMsgServerToGCMatchSignout
 *      ->
 *   10015 CMsgServerToGCMatchSignoutResponse
 *
 * Current protobuf:
 *
 * message CMsgServerToGCMatchSignoutResponse {
 *     enum ESignoutResult {
 *         k_ESignout_Failed_Retry = 1;
 *         k_ESignout_Failed_NoRetry = 2;
 *         k_ESignout_Failed_InFlight = 3;
 *         k_ESignout_Success = 4;
 *         k_ESignout_Success_AlreadySignedOut = 5;
 *     }
 *
 *     optional ESignoutResult result = 1;
 * }
 *
 * Minimal successful protobuf:
 *
 *   field 1 / varint / value 4
 *   08 04
 *
 * Base64:
 *   CAQ=
 *
 * IMPORTANT:
 * 10014 is decoded READ-ONLY for diagnostics by Decoder V2.
 * It is still NOT persisted to MatchHistory/Profile/Ranked.
 * The GameServer signout handshake remains unchanged.
 */

export function requestDeadlockMatchSignoutRaw(): boolean {
    if (
        messageType() !=
        10014
    ) {
        return false;
    }

    log(
        "[10014-GS] RAW MatchSignout received"
    );

    // === SKYNET_DEADLOCK_REAL_10014_DECODER_V2_BEGIN ===
    //
    // READ ONLY.
    //
    // Detailed protobuf diagnostics now happen entirely inside
    // the C# host. Do not inspect a returned TsObject here:
    // TypeSharp previously produced misleading numeric log lines
    // while concatenating host-object properties.
    //
    // Any decoder failure is swallowed by the C# diagnostic host.
    // The working 10015 + 35000ms lifecycle below is therefore
    // never blocked by diagnostics.
    //
    deadlockInspectCurrentMatchSignoutV2();
    // === SKYNET_DEADLOCK_REAL_10014_DECODER_V2_END ===


    /*
     * CMsgServerToGCMatchSignoutResponse
     *
     * result = k_ESignout_Success
     *
     * field 1 = 4
     *
     * protobuf:
     *   08 04
     */
    const response = [
        8,
        4
    ];

    reply(
        10015,
        response,
        true
    );

    // SKYNET_DEADLOCK_CLIENT_POSTGAME_CLEANUP_V1_CALL
    //
    // 10015 Success has already been queued.
    //
    // Push the same type3 SO/cache teardown proven by manual 9015,
    // but directly to the client(s):
    //
    //   26 EMPTY
    //   25 CacheUnsubscribed
    //
    // No synthetic 9015 and no synthetic 9016.
    //
    const clientPostGameCleanupQueued =
        emitDeadlockClientPostGameCleanup();

    log(
        "[10014-GS] client postgame cleanup queued=" +
        clientPostGameCleanupQueued
    );

    // SKYNET_DEADLOCK_POSTMATCH_TYPE107_CRASH_GUARD_V17
    // Live client evidence: after the valid PostMatch type101 and cache
    // unsubscribe, the synthetic 26/type107 was the last GC message retrieved
    // before a C0000005 null-adjacent read in client.dll. The real server
    // signout already carries the bot table, human row, MVP and account stats.
    // Keep the unverified type107/9166 refresh disabled until an exact official
    // payload and cache context can be replayed.
    log(
        "[10014-GS] synthetic postmatch type107/9166 disabled"
    );

    // === SKYNET_DEADLOCK_10014_DELAYED_RELEASE_V1_BEGIN ===
    //
    // IMPORTANT:
    // reply(10015) above only queues the HTTP response.
    //
    // Do NOT call synchronous deadlockReleaseDedicatedServer()
    // here: that could kill the requester before 10015 reaches it.
    //
    // The C# host parses lobby_id directly from the current
    // 10014 BodyBase64, verifies Supervisor ownership, then
    // performs Release() after a short delay.
    //
    const releaseScheduled: any =
        deadlockScheduleCurrentMatchSignoutRelease(
            35000,
            "match-signout-success"
        );

    log(
        "[10014-GS] delayed dedicated release scheduled=" +
        releaseScheduled +
        " delay_ms=35000"
    );

    // === SKYNET_DEADLOCK_10014_DELAYED_RELEASE_V1_END ===

    log(
        "[10014-GS] replied 10015 result=Success(4) bytes=2"
    );

    return true;
}
