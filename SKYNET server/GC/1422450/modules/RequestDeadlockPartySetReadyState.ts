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

    const ready =
        ctx.request.ready ??
        false;

    member.is_ready =
        ready;

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
