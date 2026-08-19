import {
    EGCCitadelClientMessages,
    CMsgClientToGCGetAccountStatsResponseEResult
} from "../generated/protobuf";

import {
    gc,
    HandlerContext,
    Route
} from "../framework/gc";

export const RequestDeadlockGetAccountStatsRoute: Route = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCGetAccountStats,

    request: {
        name:
            "CMsgClientToGCGetAccountStats"
    },

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCGetAccountStatsResponse,

    response: {
        name:
            "CMsgClientToGCGetAccountStatsResponse"
    }
};

export const requestDeadlockGetAccountStats = (
    ctx: HandlerContext
): void => {
    const request =
        ctx.request;

    /*
     * Proto:
     *
     * optional uint32 account_id = 1;
     *
     * Если клиент не передал account_id,
     * используем accountId текущей Steam-сессии.
     */
    const requestedAccountId =
        request.account_id ??
        ctx.accountId;

    /*
     * Структура ответа полностью соответствует proto.
     *
     * Реальный Valve GC присылает большой массив
     * CMsgAccountHeroStats (~3.8 KB в нашем NetHook).
     *
     * Пока локальной базы статистики нет —
     * возвращаем валидный Success с пустым stats[].
     */
    ctx.reply({
        result:
            CMsgClientToGCGetAccountStatsResponseEResult
                .k_eSuccess,

        stats: {
            account_id:
                requestedAccountId,

            stats: []
        }
    });
};

export const createRequestDeadlockGetAccountStatsHandler =
    () => requestDeadlockGetAccountStats;


export default requestDeadlockGetAccountStats;
