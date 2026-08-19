import {
    encodeProto
} from "../framework/gc";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

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

    // === SKYNET_POST_START_9100_RAW_V2 ===

    /*
     * Exact raw Valve GC message 9100 captured immediately after
     * successful 9132.
     *
     * IMPORTANT:
     *
     * TypeSharp host function "send" is registered by SKYNET as:
     *
     *   send(messageType, payload, protobuf?)
     *
     * Payload here is an ordinary byte array.
     *
     * No ProtoDescriptor is involved.
     */
    const valve9100Payload: number[] = [
        10, 243, 1, 17, 173, 61, 161, 162, 254, 196, 31, 60,
        26, 165, 1, 13, 51, 30, 134, 106, 29, 0, 0, 0,
        0, 56, 242, 232, 86, 66, 19, 10, 8, 109, 97, 116,
        99, 104, 95, 105, 100, 41, 236, 35, 252, 5, 0, 0,
        0, 0, 90, 74, 115, 116, 111, 0, 2, 90, 34, 177,
        202, 27, 10, 77, 47, 160, 116, 206, 42, 180, 255, 26,
        9, 218, 45, 108, 74, 202, 223, 120, 121, 96, 147, 203,
        255, 78, 58, 254, 77, 77, 240, 9, 102, 87, 13, 151,
        74, 202, 76, 175, 102, 154, 0, 241, 98, 29, 87, 24,
        152, 81, 4, 106, 139, 96, 204, 44, 152, 127, 207, 16,
        50, 93, 3, 17, 243, 206, 114, 25, 115, 116, 101, 97,
        109, 105, 100, 58, 55, 54, 53, 54, 49, 49, 57, 56,
        48, 56, 57, 53, 57, 50, 50, 55, 51, 122, 25, 115,
        116, 101, 97, 109, 105, 100, 58, 57, 48, 50, 57, 49,
        50, 51, 50, 52, 54, 49, 53, 52, 51, 52, 51, 54,
        34, 64, 88, 132, 40, 125, 96, 120, 31, 76, 196, 52,
        190, 118, 32, 244, 100, 88, 1, 134, 15, 193, 111, 158,
        250, 6, 56, 126, 1, 240, 36, 77, 222, 81, 80, 223,
        88, 114, 246, 37, 33, 146, 230, 29, 214, 111, 68, 0,
        7, 25, 112, 104, 70, 96, 184, 46, 3, 74, 21, 207,
        148, 244, 60, 22, 228, 1
    ];

    log(
        "[9131-POST] real9100.bytes=" +
        valve9100Payload.length
    );

    send(
        9100,
        valve9100Payload,
        true
    );

    log(
        "[9131-POST] sequence=9131->26->9132->9100"
    );

    // === SKYNET_REAL_POST_START_CAPTURE_REPLAY_V2 ===

    /*
     * Exact post-start SO payloads from the successful Valve capture.
     *
     * 105:
     *   Msg 24
     *   owner type=3
     *   empty match cache
     *
     * 106:
     *   Msg 24
     *   owner type=3
     *   object type_id=101
     *
     * 107:
     *   Msg 26
     *   Party type_id=105 update
     *
     * 108:
     *   Msg 26
     *   match type_id=101 update
     *
     * These are raw protobuf payloads.
     *
     * No ProtoDescriptor.
     * No re-encoding.
     * No placeholder SO.
     */

    const valvePost105: number[] = [
        25, 236, 95, 131, 236, 217, 132, 106, 0, 34, 12, 8,
        3, 16, 142, 230, 135, 224, 158, 155, 161, 181, 1, 48,
        1, 57, 237, 95, 131, 236, 217, 132, 106, 0
    ];

    const valvePost106: number[] = [
        18, 45, 8, 101, 18, 41, 8, 142, 230, 135, 224, 158,
        155, 161, 181, 1, 16, 236, 199, 240, 47, 24, 2, 32,
        1, 40, 151, 52, 57, 12, 216, 51, 197, 101, 199, 64,
        1, 104, 151, 52, 112, 1, 120, 0, 128, 1, 2, 25,
        20, 36, 220, 237, 217, 132, 106, 1, 34, 12, 8, 3,
        16, 142, 230, 135, 224, 158, 155, 161, 181, 1, 40, 1,
        48, 0, 57, 237, 95, 131, 236, 217, 132, 106, 0
    ];

    const valvePost107: number[] = [
        18, 215, 1, 8, 105, 18, 210, 1, 8, 221, 203, 134,
        224, 158, 155, 161, 181, 2, 18, 53, 8, 209, 187, 213,
        61, 18, 7, 105, 103, 115, 118, 101, 102, 102, 24, 2,
        32, 0, 40, 0, 48, 151, 52, 56, 1, 74, 6, 10,
        4, 8, 72, 16, 0, 80, 2, 88, 30, 104, 0, 114,
        12, 8, 1, 16, 1, 40, 14, 40, 63, 40, 64, 48,
        1, 48, 249, 248, 129, 6, 56, 3, 72, 2, 80, 1,
        88, 0, 98, 0, 104, 0, 112, 2, 120, 4, 128, 1,
        1, 138, 1, 115, 18, 7, 8, 10, 16, 209, 187, 213,
        61, 24, 1, 32, 0, 48, 0, 56, 1, 66, 2, 8,
        7, 66, 2, 8, 1, 66, 2, 8, 27, 66, 2, 8,
        31, 66, 2, 8, 23, 66, 2, 8, 22, 66, 2, 8,
        2, 66, 2, 8, 5, 66, 2, 8, 28, 66, 2, 8,
        19, 66, 2, 8, 8, 66, 2, 8, 14, 66, 2, 8,
        44, 66, 2, 8, 24, 66, 2, 8, 3, 66, 2, 8,
        52, 66, 2, 8, 21, 66, 2, 8, 9, 66, 2, 8,
        45, 66, 2, 8, 15, 66, 2, 8, 39, 66, 2, 8,
        38, 66, 2, 8, 11, 66, 2, 8, 10, 72, 1, 152,
        1, 1, 25, 198, 78, 212, 237, 217, 132, 106, 2, 50,
        12, 8, 2, 16, 221, 203, 134, 224, 158, 155, 161, 181,
        2, 56, 1
    ];

    const valvePost108: number[] = [
        18, 47, 8, 101, 18, 43, 8, 142, 230, 135, 224, 158,
        155, 161, 181, 1, 16, 236, 199, 240, 47, 24, 2, 32,
        1, 40, 151, 52, 57, 12, 216, 51, 197, 101, 199, 64,
        1, 64, 1, 104, 151, 52, 112, 1, 120, 0, 128, 1,
        2, 25, 74, 37, 220, 237, 217, 132, 106, 1, 50, 12,
        8, 3, 16, 142, 230, 135, 224, 158, 155, 161, 181, 1,
        56, 1
    ];

    log(
        "[9131-REAL] 105.bytes=" +
        valvePost105.length
    );

    send(
        24,
        valvePost105,
        true
    );

    log(
        "[9131-REAL] 106.bytes=" +
        valvePost106.length
    );

    send(
        24,
        valvePost106,
        true
    );

    log(
        "[9131-REAL] 107.bytes=" +
        valvePost107.length
    );

    send(
        26,
        valvePost107,
        true
    );

    log(
        "[9131-REAL] 108.bytes=" +
        valvePost108.length
    );

    send(
        26,
        valvePost108,
        true
    );

    log(
        "[9131-REAL] sequence=9100->24->24->26->26"
    );

    // === SKYNET_REAL_POST_START_CAPTURE_REPLAY_V2 ===


    // === SKYNET_POST_START_9100_RAW_V2 ===


    


    log(
        "[9131] sequence=9131->26->9132"
    );

    return true;
}
