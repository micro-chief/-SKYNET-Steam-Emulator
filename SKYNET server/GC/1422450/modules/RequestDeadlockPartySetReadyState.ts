// === SKYNET_DEADLOCK_PARTY_READY_V1 ===

import {
    encodeProto
} from "../framework/gc";

import {
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

interface PartyReadyRequest {
    readonly party_id?: bigint;
    /*
     * Official protobuf field #2:
     *   optional bool ready_state = 2;
     */
    readonly ready_state?: boolean;
    readonly readyState?: boolean;

    /*
     * Legacy SKYNET alias.
     * Kept only for backward compatibility.
     */
    readonly ready?: boolean;
}

interface PartyReadyResponse {
    readonly result?: number;
}

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetReadyState"
} as ProtoDescriptor<PartyReadyRequest>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetReadyStateResponse"
} as ProtoDescriptor<PartyReadyResponse>;

export const RequestDeadlockPartySetReadyStateRoute = {
    requestId:
        9142,

    request:
        requestProto,

    responseId:
        9143,

    response:
        responseProto
} as GcRoute<
    PartyReadyRequest,
    PartyReadyResponse
>;

let readyVersion =
    0n;

function findCurrentMember(
    party: any,
    accountId: number
): any {
    for (
        let i = 0;
        i < party.members.length;
        i++
    ) {
        const member =
            party.members[i];

        if (
            member.account_id ===
            accountId
        ) {
            return member;
        }
    }

    return null;
}

export function requestDeadlockPartySetReadyState(
    ctx: any
): boolean {
    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
        log(
            "[9142] no active party"
        );

        ctx.reply({
            result:
                2
        });

        return true;
    }

    const requestedPartyId =
        ctx.request.party_id ??
        0n;

    if (
        requestedPartyId !== 0n &&
        requestedPartyId !==
            party.party_id
    ) {
        log(
            "[9142] invalid party id"
        );

        ctx.reply({
            result:
                2
        });

        return true;
    }

    const member =
        findCurrentMember(
            party,
            ctx.accountId
        );

    if (!member) {
        log(
            "[9142] current member not found account_id=" +
            ctx.accountId
        );

        ctx.reply({
            result:
                4
        });

        return true;
    }

    // === SKYNET_9142_HERO_PLAY_READY_FIX_V1_BEGIN ===

    const readyRequest: any =
        ctx.request;

    // === SKYNET_9142_CANONICAL_READY_STATE_V1_BEGIN ===
    /*
     * CMsgClientToGCPartySetReadyState:
     *
     *   fixed64 party_id    = 1
     *   bool    ready_state = 2
     *   message hero_roster = 3
     *
     * The old SKYNET handler incorrectly read:
     *
     *   ctx.request.ready
     *
     * Therefore explicit ready_state=false was interpreted as
     * "no ready field", hero_roster won, and the member was forced
     * back to ready=true.
     */

    const readyRequest9142: any =
        ctx.request;

    const readyMember9142: any =
        member;

    /*
     * ProtoCodec may expose either:
     *
     *   ready_state
     *   readyState
     *
     * Keep legacy ready only as final compatibility fallback.
     */
    const explicitReadyState9142 =
        readyRequest9142.ready_state ??
        readyRequest9142.readyState ??
        readyRequest9142.ready;

    const incomingHeroRoster9142 =
        readyRequest9142.hero_roster ??
        readyRequest9142.heroRoster;

    /*
     * Because the codec prefers camelCase aliases when both are
     * present, read camelCase first from the existing Party SO.
     */
    const previousReady9142 =
        readyMember9142.isReady ??
        readyMember9142.is_ready ??
        false;

    let ready =
        previousReady9142;

    /*
     * Precedence:
     *
     * 1. Explicit ready_state=true/false ALWAYS wins.
     * 2. hero_roster implies ready=true ONLY when ready_state
     *    was not supplied.
     * 3. Otherwise preserve previous state.
     */
    if (
        explicitReadyState9142 ===
        true
    ) {
        ready =
            true;

        log(
            "[9142-READY] ready_state=true"
        );
    }
    else if (
        explicitReadyState9142 ===
        false
    ) {
        ready =
            false;

        log(
            "[9142-READY] ready_state=false"
        );
    }
    else if (
        incomingHeroRoster9142 !=
        null
    ) {
        ready =
            true;

        log(
            "[9142-READY] ready_state=absent hero_roster=true -> ready=true"
        );
    }
    else {
        log(
            "[9142-READY] ready_state=absent preserving previous state"
        );
    }

    /*
     * Synchronize BOTH aliases before the Party is encoded.
     */
    readyMember9142.is_ready =
        ready;

    readyMember9142.isReady =
        ready;

    if (
        ready ===
        true
    ) {
        log(
            "[9142-READY] final=true"
        );
    }
    else {
        log(
            "[9142-READY] final=false"
        );
    }

    // === SKYNET_9142_CANONICAL_READY_STATE_V1_END ===

    // === SKYNET_READY_HERO_ROSTER_SYNC_V6 ===

    const heroRequest: any =
        ctx.request;

    const heroMember: any =
        member;

    const skynetIncomingHeroRoster9142: any =
        heroRequest.heroRoster ??
        heroRequest.hero_roster;

    if (
        skynetIncomingHeroRoster9142 !=
        null
    ) {
        heroMember.hero_roster =
            skynetIncomingHeroRoster9142;

        heroMember.heroRoster =
            skynetIncomingHeroRoster9142;

        log(
            "[9142-ALIAS] hero_roster + heroRoster synchronized"
        );

        log(
            "[9142-HERO] present=true"
        );
    }
    else {
        log(
            "[9142-HERO] present=false"
        );
    }

    // === SKYNET_READY_HERO_ROSTER_SYNC_V6 ===


    


    log(
        "[9142] party_id=" +
        party.party_id
    );

    log(
        "[9142] account_id=" +
        ctx.accountId
    );

    log(
        "[9142] ready=" +
        ready
    );

    // === SKYNET_CUSTOM_MATCH_START_GATE_TEAM_SYNC_V11_BEGIN ===
    /*
     * Custom Match start-gate synchronization.
     *
     * UI position is already driven correctly by:
     *
     *   private_lobby_settings.match_slots
     *
     * But Member.team can remain absent.
     *
     * Real client-side StartMatch gating appears to require
     * a fully coherent Member + MatchSlot state before it emits
     * message 9131.
     */

    const gateMembers =
        party.members ??
        [];

    // SKYNET_CUSTOM_MATCH_START_GATE_TEAM_SYNC_V11
    if (
        party.private_lobby_settings ===
        undefined
    ) {
        party.private_lobby_settings = {
            match_slots: []
        };
    }

    if (
        party.private_lobby_settings.match_slots ===
        undefined
    ) {
        party.private_lobby_settings.match_slots =
            [];
    }

    const gateSlots =
        party.private_lobby_settings.match_slots;

    log(
        "[9142-GATE] ========================================"
    );

    log(
        "[9142-GATE] ready=" +
        ready
    );

    log(
        "[9142-GATE] members=" +
        gateMembers.length
    );

    log(
        "[9142-GATE] slots=" +
        gateSlots.length
    );

    for (
        let gateMemberIndex = 0;
        gateMemberIndex < gateMembers.length;
        gateMemberIndex++
    ) {
        const gateMember =
            gateMembers[
                gateMemberIndex
            ];

        const gateAccountId =
            gateMember.account_id ??
            0;

        /*
         * The ready request belongs to this GC account.
         *
         * Explicitly persist the value even if the older
         * handler code already assigned it earlier.
         */
        if (
            gateAccountId ===
            ctx.accountId
        ) {
            gateMember.is_ready =
                ready;
        }

        let gateSlotId =
            -1;

        for (
            let gateSlotIndex = 0;
            gateSlotIndex < gateSlots.length;
            gateSlotIndex++
        ) {
            const gateSlot =
                gateSlots[
                    gateSlotIndex
                ];

            if (
                (
                    gateSlot.player_account_id ??
                    0
                ) ===
                gateAccountId
            ) {
                gateSlotId =
                    gateSlot.slot_id ??
                    -1;

                break;
            }
        }

        /*
         * Proven working playable slot layout from our
         * Custom Match roster implementation.
         */
        if (
            gateSlotId >= 10 &&
            gateSlotId <= 15
        ) {
            gateMember.team =
                0;

            gateMember.player_type =
                0;
        }
        else if (
            gateSlotId >= 20 &&
            gateSlotId <= 25
        ) {
            gateMember.team =
                1;

            gateMember.player_type =
                0;
        }

        log(
            "[9142-GATE] member[" +
            gateMemberIndex +
            "] account_id=" +
            gateAccountId +
            " slot=" +
            gateSlotId +
            " ready=" +
            (
                gateMember.is_ready ??
                false
            ) +
            " team=" +
            (
                gateMember.team ??
                -1
            ) +
            " player_type=" +
            (
                gateMember.player_type ??
                -1
            )
        );
    }

    /*
     * Specific sanity log for the local user.
     */
    let gateCurrentMemberFound =
        false;

    for (
        let gateCheckIndex = 0;
        gateCheckIndex < gateMembers.length;
        gateCheckIndex++
    ) {
        const gateCheckMember =
            gateMembers[
                gateCheckIndex
            ];

        if (
            (
                gateCheckMember.account_id ??
                0
            ) ===
            ctx.accountId
        ) {
            gateCurrentMemberFound =
                true;

            log(
                "[9142-GATE] current account READY=" +
                (
                    gateCheckMember.is_ready ??
                    false
                ) +
                " TEAM=" +
                (
                    gateCheckMember.team ??
                    -1
                )
            );

            break;
        }
    }

    log(
        "[9142-GATE] current_member_found=" +
        gateCurrentMemberFound
    );

    log(
        "[9142-GATE] publish coherent Party SO"
    );

    // === SKYNET_CUSTOM_MATCH_START_GATE_TEAM_SYNC_V11_END ===


    const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    if (
        readyVersion ===
        0n
    ) {
        readyVersion =
            party.party_id +
            200n;
    }
    else {
        readyVersion =
            readyVersion +
            1n;
    }

    const update = {
        objects_modified: [
            {
                type_id:
                    105,

                object_data:
                    partyBytes
            }
        ],

        objects_added:
            [],

        objects_removed:
            [],

        version:
            readyVersion,

        owner_soid: {
            type:
                2,

            id:
                party.party_id
        },

        service_id:
            1
    };

    /*
     * Fresh Valve ordering:
     *
     *   9142
     *     -> 26 Party SO mutation
     *     -> 9143
     */
    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        update
    );

    ctx.reply({
        result:
            1
    });

    log(
        "[9142] sequence=9142->26->9143 bytes=" +
        partyBytes.length
    );

    return true;
}
