import { gc } from "../framework/gc";
import { Msg, Routes } from "../generated/cs2";

const DefaultCompetitiveRankType = 6;
const DefaultCompetitiveRank = 1;

export function registerClientServices(): void {
    gc.on(Routes.VolatileShop, (ctx) => {
        // defidx 4040 is a one-way subscription in the captured Valve flow.
        // Returning an invented empty snapshot makes the current client treat
        // its Steam connection as invalid. The real GC does not answer this
        // request; a separate 5316 request is used for an actual shop page.
        ctx.logger.info("Accepted CS2 volatile-shop subscription " + (ctx.request.defidx ?? 0));
    });

    gc.on(Routes.RecurringMissionSchedule, (ctx) => {
        ctx.reply({ missions: [] });
    });

    gc.on(Routes.StoreUserData, (ctx) => {
        ctx.reply({
            result: 1,
            currencyDeprecated: ctx.request.currency ?? 3,
            countryDeprecated: "",
            priceSheetVersion: 0
        });
    });

    gc.on(Routes.EventFavorites, (ctx) => {
        ctx.reply({ jsonFavorites: "[]" });
    });

    gc.on(Routes.RankUpdate, (ctx) => {
        const requested = ctx.request.rankings?.[0];
        ctx.reply({
            rankings: [{
                accountId: ctx.accountId,
                rankId: DefaultCompetitiveRank,
                wins: 0,
                rankChange: 0,
                rankTypeId: requested?.rankTypeId ?? DefaultCompetitiveRankType,
                highestRank: DefaultCompetitiveRank
            }]
        });
    });

    gc.on(Routes.TournamentGames, (ctx) => {
        ctx.reply({
            msgrequestid: Msg.MatchListRequestTournamentGames,
            accountid: ctx.accountId,
            servertime: ctx.clock.now(),
            matches: [],
            streams: []
        });
    });

    gc.on(Routes.RecentUserGames, (ctx) => {
        ctx.reply({
            msgrequestid: Msg.MatchListRequestRecentUserGames,
            accountid: ctx.request.accountid ?? ctx.accountId,
            servertime: ctx.clock.now(),
            matches: [],
            streams: []
        });
    });

    gc.on(Routes.AccountCoPlays, (ctx) => {
        ctx.reply({
            players: [],
            servertime: ctx.clock.now()
        });
    });

    gc.on(Routes.PartySearch, (ctx) => {
        ctx.reply({ entries: [] });
    });

    gc.on(Routes.TournamentPredictions, (ctx) => {
        ctx.reply({ eventid: ctx.request.eventid ?? 0 });
    });
}
