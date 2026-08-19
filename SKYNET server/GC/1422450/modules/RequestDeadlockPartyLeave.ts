// === SKYNET_DEADLOCK_PARTY_LEAVE_V1 ===

import {
    encodeProto
} from "../framework/gc";

import {
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

import {
    clearCurrentDeadlockPartyState,
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

import {
    releaseDeadlockPartyJoinCode
} from "./PartyCodeRegistry";

interface PartyLeaveRequest {
    readonly party_id?: bigint;
}

interface PartyLeaveResponse {
    readonly result?: number;
}

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyLeave"
} as ProtoDescriptor<PartyLeaveRequest>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyLeaveResponse"
} as ProtoDescriptor<PartyLeaveResponse>;

export const RequestDeadlockPartyLeaveRoute = {
    requestId:
        9125,

    request:
        requestProto,

    responseId:
        9126,

    response:
        responseProto
} as GcRoute<
    PartyLeaveRequest,
    PartyLeaveResponse
>;

let leaveVersion =
    0n;

export function requestDeadlockPartyLeave(
    ctx: any
): boolean {
    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
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
        ctx.reply({
            result:
                2
        });

        return true;
    }

    const partyId =
        party.party_id;

    /*
     * Official capture:
     *
     *   9125
     *     -> 26
     *     -> 9126
     *     -> 25
     */

    party.members =
        [];

    if (
        party.private_lobby_settings
    ) {
        party.private_lobby_settings.match_slots =
            [];
    }

    const bytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    if (
        leaveVersion ===
        0n
    ) {
        leaveVersion =
            partyId +
            100n;
    }

    const update = {
        objects_modified: [
            {
                type_id:
                    105,

                object_data:
                    bytes
            }
        ],

        objects_added:
            [],

        objects_removed:
            [],

        version:
            leaveVersion,

        owner_soid: {
            type:
                2,

            id:
                partyId
        },

        service_id:
            1
    };

    log(
        "[9125] phase=26 party member removed"
    );

    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        update
    );

    log(
        "[9125] phase=9126 success"
    );

    ctx.reply({
        result:
            1
    });

    const unsubscribe = {
        owner_soid: {
            type:
                2,

            id:
                partyId
        }
    };

    log(
        "[9125] phase=25 CacheUnsubscribed"
    );

    ctx.send(
        25,
        "CMsgSOCacheUnsubscribed",
        unsubscribe
    );

    // === SKYNET_RELEASE_PARTY_CODE_ON_LEAVE_V2 ===

    releaseDeadlockPartyJoinCode(
        party.party_id
    );

    log(
        "[9125-CODE] released party_id=" +
        party.party_id
    );

    clearCurrentDeadlockPartyState();

    log(
        "[9125] sequence=9125->26->9126->25"
    );

    return true;
}
