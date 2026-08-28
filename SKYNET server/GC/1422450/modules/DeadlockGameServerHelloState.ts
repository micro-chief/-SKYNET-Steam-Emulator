// SKYNET_DEADLOCK_GS_HELLO_MULTI_STATE_V2

/*
 * During the 35 second release grace an old dedicated and the next dedicated
 * may overlap. Each SteamID receives its first 4005 exactly once; a rehello
 * from either server remains suppressed.
 */

const deadlockWelcomedGameServerSteamIds: bigint[] =
    [];

export function isDeadlockGameServerHelloDuplicate(
    steamId: bigint
): boolean {
    for (
        let index = 0;
        index < deadlockWelcomedGameServerSteamIds.length;
        index++
    ) {
        if (
            deadlockWelcomedGameServerSteamIds[index] ===
            steamId
        ) {
            return true;
        }
    }

    return false;
}

export function markDeadlockGameServerWelcomed(
    steamId: bigint
): void {
    if (
        steamId ===
            0n ||
        isDeadlockGameServerHelloDuplicate(
            steamId
        )
    ) {
        return;
    }

    deadlockWelcomedGameServerSteamIds.push(
        steamId
    );
}

export function getDeadlockWelcomedGameServerSteamId(): bigint {
    if (
        deadlockWelcomedGameServerSteamIds.length ===
        0
    ) {
        return 0n;
    }

    return deadlockWelcomedGameServerSteamIds[
        deadlockWelcomedGameServerSteamIds.length -
        1
    ];
}
