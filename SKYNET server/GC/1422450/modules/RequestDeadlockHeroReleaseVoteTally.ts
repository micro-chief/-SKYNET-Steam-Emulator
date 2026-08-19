import {
    EGCCitadelClientMessages
} from "../generated/protobuf";

import {
    gc,
    HandlerContext,
    Route
} from "../framework/gc";

export const RequestDeadlockHeroReleaseVoteTallyRoute: Route = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCRequestHeroReleaseVoteTally,

    request: {
        name:
            "CMsgClientToGCRequestHeroReleaseVoteTally"
    },

    responseId:
        EGCCitadelClientMessages
            .k_EMsgGCToClientUpdateHeroReleaseVoteTally,

    response: {
        name:
            "CMsgGCToClientUpdateHeroReleaseVoteTally"
    }
};

export const requestDeadlockHeroReleaseVoteTally = (
    ctx: HandlerContext
): void => {
    const request =
        ctx.request;

    const voteRounds =
        request.vote_rounds ??
        [];

    const entries: any[] =
        [];

    /*
     * Реальный NetHook:
     *
     * request:
     *   vote_rounds = [0, 1]
     *
     * response:
     *   key = 1, value = {}
     *   key = 0, value = {}
     *
     * Поэтому воспроизводим порядок,
     * наблюдавшийся у Valve GC.
     */
    for (
        let i =
            voteRounds.length - 1;
        i >= 0;
        i--
    ) {
        entries.push({
            key:
                voteRounds[i],

            /*
             * CMsgHeroReleaseVoteTally состоит
             * только из optional/repeated полей.
             *
             * В нашем реальном packet 9281
             * nested value был пустым.
             */
            value: {}
        });
    }

    ctx.reply({
        vote_round_to_tally:
            entries
    });
};

export const createRequestDeadlockHeroReleaseVoteTallyHandler =
    () => requestDeadlockHeroReleaseVoteTally;


export default requestDeadlockHeroReleaseVoteTally;
