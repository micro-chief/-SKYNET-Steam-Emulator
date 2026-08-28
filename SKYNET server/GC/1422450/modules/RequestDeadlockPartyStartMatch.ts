import {
    encodeProto
} from "../framework/gc";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

// SKYNET_DEADLOCK_EPHEMERAL_MATCH_LOBBY_V1_START
import {
    beginDeadlockMatchLobby
} from "./DeadlockMatchLobbyState";

// === SKYNET_MATCH_FOUND_ARM_IMPORT_V1 ===
import {
    armDeadlockMatchFound
} from "./DeadlockMatchFound";

import {
    CMsgClientToGCPartyStartMatch,
    CMsgClientToGCPartyStartMatchResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

const PARTY_SO_TYPE_ID =
    105;

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyStartMatch"
} as ProtoDescriptor<
    CMsgClientToGCPartyStartMatch
>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyStartMatchResponse"
} as ProtoDescriptor<
    CMsgClientToGCPartyStartMatchResponse
>;

export const RequestDeadlockPartyStartMatchRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCPartyStartMatch,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCPartyStartMatchResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCPartyStartMatch,
    CMsgClientToGCPartyStartMatchResponse
>;

export function requestDeadlockPartyStartMatch(
    ctx: any
): boolean {
    const request =
        ctx.request;

    const party =
        getCurrentDeadlockPartyState();

    log(
        "[9131] ========================================"
    );

    if (!party) {
        log(
            "[9131] no current Party"
        );

        ctx.reply({
            result:
                1,

            account_id:
                0
        });

        return true;
    }

    const matchLobbyId =
        beginDeadlockMatchLobby(
            party.party_id
        );

    if (
        matchLobbyId ===
        0n
    ) {
        log("[9131-DS] ABORT match lobby allocation failed");
        return true;
    }

    const requestPartyId =
        request.party_id ??
        0n;

    log(
        "[9131] request.party_id=" +
        requestPartyId
    );

    log(
        "[9131] state.party_id=" +
        party.party_id
    );

    if (
        requestPartyId !=
            0n &&
        requestPartyId !=
            party.party_id
    ) {
        log(
            "[9131] WARNING party_id mismatch"
        );
    }

    /*
     * Official capture:
     *
     *   9131
     *     -> 26, CSOCitadelParty type 105
     *     -> 9132
     *
     * Do not invent MatchFound/GameServer here yet.
     */
// === SKYNET_9131_FINDING_MATCH_STATE_V1_BEGIN ===

/*
 * Official Valve 9131 Party transition:
 *
 * member.is_ready:
 *   true -> false
 *
 * CSOCitadelParty.match_making_start_time:
 *   absent -> current unix time
 *
 * This is the state that makes the client enter
 * FindingMatch.
 */
const matchmakingStartTime =
    now();

party.match_making_start_time =
    matchmakingStartTime;

const matchmakingMembers =
    party.members ??
    [];

let matchmakingMemberIndex =
    0;

while (
    matchmakingMemberIndex <
    matchmakingMembers.length
) {
    matchmakingMembers[
        matchmakingMemberIndex
    ].is_ready =
        false;

    matchmakingMemberIndex =
        matchmakingMemberIndex +
        1;
}

log(
    "[9131-MM] match_making_start_time=" +
    matchmakingStartTime
);

log(
    "[9131-MM] members.count=" +
    matchmakingMembers.length
);

log(
    "[9131-MM] state=FINDING_MATCH"
);

// === SKYNET_9131_FINDING_MATCH_STATE_V1_END ===
    // === SKYNET_MATCH_FOUND_ARM_V1_BEGIN ===

    /*
     * Search is now active.
     *
     * Do NOT emit MatchFound here.
     *
     * This only records the active search so that
     * the future GameServer allocator can complete it.
     */
    armDeadlockMatchFound(
        party.party_id,
        party.match_making_start_time ??
            now()
    );

    log(
        "[9131-MM] MatchFound armed"
    );

    // === SKYNET_MATCH_FOUND_ARM_V1_END ===



    const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    const partyUpdate = {
        objects_modified: [
            {
                type_id:
                    PARTY_SO_TYPE_ID,

                object_data:
                    partyBytes
            }
        ],

        owner_soid: {
            type:
                2,

            id:
                party.party_id
        },

        service_id:
            1,

        version:
            party.party_id +
            1000n
    };

    log(
        "[9131] send 26 type_id=105"
    );

    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        partyUpdate
    );

    log(
        "[9131] reply 9132 result=1 account_id=0"
    );

    ctx.reply({
        result:
            1,

        account_id:
            0
    });

    // === SKYNET_DEADLOCK_9131_START_DEDICATED_V2_BEGIN ===

    /*
     * Preserve official/local working GC ordering:
     *
     *   9131
     *     -> 26 Party SO
     *     -> 9132
     *
     * Only AFTER 9132 do we request a real dedicated allocation.
     *
     * The C# DeadlockDedicatedServerSupervisor is idempotent
     * for the same party/lobby id.
     *
     * No MatchFound emit here yet.
     * No 9100 here yet.
     * No CSOCitadelLobby type_id=101 here yet.
     */

    // SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_PARTY
    // The official captured bot match retained bot_difficulty=3.
    // Zero is the strict no-bot path.
    const requestedBotDifficulty =
        party.bot_difficulty ??
        0;

    const botDifficulty =
        requestedBotDifficulty >= 1 &&
        requestedBotDifficulty <= 3
            ? requestedBotDifficulty
            : 0;

    const botMatch =
        botDifficulty > 0;

    // SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19
    const requestedGameMode =
        party.game_mode ??
        party.gameMode ??
        1;

    const gameMode =
        requestedGameMode === 4
            ? 4
            : 1;

    // SKYNET_DEADLOCK_STREET_BRAWL_MIDTOWN_V20
    // Street Brawl is a ruleset on the current Midtown map. dl_streets is
    // the retained legacy four-lane map, not the current Brawl battlefield.
    const dedicatedMap =
        "dl_midtown";

    const privateSettings =
        party.private_lobby_settings ??
        party.privateLobbySettings;

    const randomizeLanes =
        privateSettings != null &&
        (
            privateSettings.randomize_lanes ??
            privateSettings.randomizeLanes ??
            false
        ) === true;

    // SKYNET_DEADLOCK_CONDITIONAL_BOTS_V11_TYPESHARP
    log(
        "[9131-DS] start request party_id=" +
        party.party_id +
        " match_lobby_id=" +
        matchLobbyId +
        " game_mode=" +
        gameMode +
        " map=" +
        dedicatedMap +
        " bot_difficulty=" +
        botDifficulty
    );

    if (randomizeLanes) {
        log("[9131-DS] lanes=standard");
    }
    else {
        log("[9131-DS] lanes=manual");
    }

    if (botMatch) {
        log("[9131-DS] bots=true");
    }
    else {
        log("[9131-DS] bots=false");
    }

    const dedicatedLaunch: any =
        deadlockStartDedicatedServer(
            matchLobbyId,
            dedicatedMap,
            botDifficulty
        );

    if (
        dedicatedLaunch == null
    ) {
        log(
            "[9131-DS] host returned null"
        );
    }
    else {
        log(
            "[9131-DS] started=" +
            dedicatedLaunch.started
        );

        log(
            "[9131-DS] port=" +
            dedicatedLaunch.port
        );

        log(
            "[9131-DS] state=" +
            dedicatedLaunch.state
        );

        log(
            "[9131-DS] error='" +
            (
                dedicatedLaunch.error ??
                ""
            ) +
            "'"
        );
    }

    // === SKYNET_DEADLOCK_9131_START_DEDICATED_V2_END ===


    


    


    log(
        "[9131] sequence=9131->26->9132"
    );

    return true;
}
