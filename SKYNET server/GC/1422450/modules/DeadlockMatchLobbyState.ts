// SKYNET_DEADLOCK_MATCH_LOBBY_STATE_V1
// SKYNET_DEADLOCK_SEPARATE_MATCH_ID_V26_STATE

let deadlockCurrentMatchPartyId =
    0n;

let deadlockCurrentMatchLobbyId =
    0n;

let deadlockCurrentMatchId =
    0n;

export function beginDeadlockMatchLobby(
    partyId: bigint
): bigint {
    if (
        partyId ===
        0n
    ) {
        log("[MATCH-LOBBY] allocation rejected: party_id=0");
        return 0n;
    }

    if (
        deadlockCurrentMatchPartyId ===
            partyId &&
        deadlockCurrentMatchLobbyId !==
            0n &&
        deadlockCurrentMatchId !==
            0n
    ) {
        log(
            "[MATCH-LOBBY] reuse current lobby_id=" +
            deadlockCurrentMatchLobbyId +
            " match_id=" +
            deadlockCurrentMatchId
        );
        return deadlockCurrentMatchLobbyId;
    }

    const allocatedLobbyId =
        deadlockAllocateEphemeralMatchLobbyId(
            partyId
        );

    if (
        allocatedLobbyId ===
        0n
    ) {
        log("[MATCH-LOBBY] host returned lobby_id=0");
        return 0n;
    }

    const allocatedMatchId =
        deadlockAllocateEphemeralMatchId(
            partyId,
            allocatedLobbyId
        );

    if (
        allocatedMatchId ===
        0n
    ) {
        log("[MATCH-LOBBY] host returned match_id=0");
        return 0n;
    }

    deadlockCurrentMatchPartyId =
        partyId;

    deadlockCurrentMatchLobbyId =
        allocatedLobbyId;

    deadlockCurrentMatchId =
        allocatedMatchId;

    log(
        "[MATCH-LOBBY] allocated party_id=" +
        partyId +
        " lobby_id=" +
        allocatedLobbyId +
        " match_id=" +
        allocatedMatchId
    );

    return allocatedLobbyId;
}

export function getCurrentDeadlockMatchLobbyId(): bigint {
    return deadlockCurrentMatchLobbyId;
}

export function getCurrentDeadlockMatchId(): bigint {
    return deadlockCurrentMatchId;
}

export function clearDeadlockMatchLobby(
    expectedLobbyId: bigint
): boolean {
    if (
        expectedLobbyId ===
            0n ||
        deadlockCurrentMatchLobbyId !==
            expectedLobbyId
    ) {
        log(
            "[MATCH-LOBBY] clear ignored expected=" +
            expectedLobbyId +
            " current=" +
            deadlockCurrentMatchLobbyId
        );
        return false;
    }

    deadlockCurrentMatchPartyId =
        0n;

    deadlockCurrentMatchLobbyId =
        0n;

    deadlockCurrentMatchId =
        0n;

    log(
        "[MATCH-LOBBY] cleared lobby_id=" +
        expectedLobbyId
    );

    return true;
}
