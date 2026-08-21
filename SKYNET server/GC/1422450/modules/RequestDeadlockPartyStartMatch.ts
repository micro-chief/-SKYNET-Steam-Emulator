import {
    encodeProto
} from "../framework/gc";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

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

    


    


    log(
        "[9131] sequence=9131->26->9132"
    );

    return true;
}
