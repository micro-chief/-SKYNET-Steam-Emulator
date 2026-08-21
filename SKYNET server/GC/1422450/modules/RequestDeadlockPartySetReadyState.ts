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

    let ready =
        member.is_ready ??
        false;

    const readyFieldPresent =
        readyRequest.ready !=
        null;

    const readyHeroRosterPresent =
        readyRequest.hero_roster !=
        null;

    /*
     * Priority:
     *
     * 1. Explicit ready from client always wins.
     *
     * 2. Hero Select -> "Играть":
     *    client can send hero_roster without an explicit ready field.
     *    That transition means the player has completed hero selection
     *    and entered the ready state.
     *
     * 3. Request containing neither field must not silently reset
     *    an already-ready member back to false.
     */
    if (
        readyFieldPresent
    ) {
        ready =
            readyRequest.ready;
    }
    else if (
        readyHeroRosterPresent
    ) {
        ready =
            true;
    }

    log(
        "[9142-READY-FIX] ========================================"
    );

    log(
        "[9142-READY-FIX] explicit_ready=" +
        readyFieldPresent
    );

    if (
        readyFieldPresent
    ) {
        log(
            "[9142-READY-FIX] request.ready=" +
            readyRequest.ready
        );
    }

    log(
        "[9142-READY-FIX] hero_roster=" +
        readyHeroRosterPresent
    );

    log(
        "[9142-READY-FIX] previous_member_ready=" +
        (
            member.is_ready ??
            false
        )
    );

    log(
        "[9142-READY-FIX] resolved_ready=" +
        ready
    );

    member.is_ready =
        ready;

    // === SKYNET_9142_HERO_PLAY_READY_FIX_V1_END ===

    // === SKYNET_READY_HERO_ROSTER_SYNC_V6 ===

    const heroRequest: any =
        ctx.request;

    const heroMember: any =
        member;

    if (
        heroRequest.hero_roster != null
    ) {
        heroMember.hero_roster =
            heroRequest.hero_roster;

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
