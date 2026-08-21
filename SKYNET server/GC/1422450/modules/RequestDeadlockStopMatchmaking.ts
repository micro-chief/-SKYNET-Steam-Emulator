// === CANCEL_FINDING_MATCH_V1 ===

import {
    encodeProto
} from "../framework/gc";

import {
    CMsgClientToGCStopMatchmaking,
    CMsgClientToGCStopMatchmakingResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

const PARTY_SO_TYPE_ID =
    105;

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStopMatchmaking"
} as ProtoDescriptor<CMsgClientToGCStopMatchmaking>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStopMatchmakingResponse"
} as ProtoDescriptor<CMsgClientToGCStopMatchmakingResponse>;

export const RequestDeadlockStopMatchmakingRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStopMatchmaking,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStopMatchmakingResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCStopMatchmaking,
    CMsgClientToGCStopMatchmakingResponse
>;

export function requestDeadlockStopMatchmaking(
    ctx: any
): boolean {
    const party =
        getCurrentDeadlockPartyState();

    log(
        "[9012] ========================================"
    );

    if (!party) {
        log(
            "[9012] no current Party"
        );

        ctx.reply({
            success:
                true
        });

        return true;
    }

    log(
        "[9012] party_id=" +
        party.party_id
    );

    log(
        "[9012] previous match_making_start_time=" +
        (
            party.match_making_start_time ??
            0
        )
    );

    /*
     * FindingMatch is driven by this optional Party field.
     *
     * StartMatch sets:
     *
     *   match_making_start_time = unix time
     *
     * Cancel must make the field absent again.
     *
     * Assigning undefined causes the optional protobuf
     * field to be omitted when CSOCitadelParty is encoded.
     */
    party.match_making_start_time =
        undefined;

    const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    const update = {
        objects_modified: [
            {
                type_id:
                    PARTY_SO_TYPE_ID,

                object_data:
                    partyBytes
            }
        ],

        objects_added:
            [],

        objects_removed:
            [],

        owner_soid: {
            type:
                2,

            id:
                party.party_id
        },

        service_id:
            1,

        /*
         * StartMatch currently uses party_id + 1000.
         * Cancellation must be a newer SO version.
         */
        version:
            party.party_id +
            1001n
    };

    log(
        "[9012] clear match_making_start_time"
    );

    log(
        "[9012] send 26 type_id=105"
    );

    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        update
    );

    log(
        "[9012] reply StopMatchmakingResponse success=true"
    );

    ctx.reply({
        success:
            true
    });

    log(
        "[9012] sequence=9012->26->9013"
    );

    return true;
}
