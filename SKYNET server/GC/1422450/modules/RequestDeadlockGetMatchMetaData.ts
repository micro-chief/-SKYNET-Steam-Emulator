import {
    Route
} from "../framework/gc";

// SKYNET_DEADLOCK_MATCH_METADATA_V2_OFFICIAL_SHAPE

export const RequestDeadlockGetMatchMetaDataRoute: Route = {
    requestId: 9167,

    request: {
        name: "CMsgClientToGCGetMatchMetaData"
    },

    responseId: 9168,

    response: {
        name: "CMsgClientToGCGetMatchMetaDataResponse"
    }
};

export const requestDeadlockGetMatchMetaData =
(ctx: any): void => {
    const request =
        ctx.request;

    log(
        "[9167] GetMatchMetaData"
    );

    log(
        "[9167] match_id=" +
        request.match_id
    );

    /*
     * Exact successful response shape observed in
     * official Deadlock capture:
     *
     * 08 01
     * 10 E9 C4 9F 49
     * 18 C7 EB 94 97 06
     * 20 B0 9C 86 D5 06
     * 28 BB 01
     * 30 E1 CE 97 D4 06
     */
    ctx.reply({
        result:
            1,

        replay_salt:
            153608809,

        metadata_salt:
            1659188679,

        replay_valid_through:
            1788972592,

        replay_group_id:
            187,

        replay_processing_through:
            1787160417
    });

    log(
        "[9168] result=success full metadata response"
    );
};

export default requestDeadlockGetMatchMetaData;
