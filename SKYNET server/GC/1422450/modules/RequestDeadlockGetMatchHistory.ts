import {
    Route
} from "../framework/gc";

// SKYNET_DEADLOCK_MATCH_HISTORY_V11_PROFILE_ACCOUNT

export const RequestDeadlockGetMatchHistoryRoute: Route = {
    requestId: 9112,

    request: {
        name: "CMsgClientToGCGetMatchHistory"
    },

    responseId: 9113,

    response: {
        name: "CMsgClientToGCGetMatchHistoryResponse"
    }
};

export const requestDeadlockGetMatchHistory =
(ctx: any): void => {
    const request =
        ctx.request;

    const gameMode =
        request.game_mode ??
        1;

    const matchMode =
        request.match_mode ??
        1;

    const rankedType =
        request.ranked_type ??
        0;

    const rankInterval =
        request.rank_interval ??
        0;

    const isRanked =
        rankedType !== 0 ||
        rankInterval !== 0;

    /*
     * 9112 explicitly contains account_id.
     *
     * When viewing another profile, this is the profile owner's
     * AccountId and MUST be used instead of the current GC session.
     *
     * account_id == 0 still means "current GC account" and is resolved
     * by the C# deadlockMatchHistory host bridge.
     */
    const targetAccountId =
        request.account_id ??
        0;

    const rows: any =
        deadlockMatchHistory(
            targetAccountId
        );

    log(
        "[9112-DB] requested_account_id=" +
        targetAccountId +
        " source_rows=" +
        rows.length
    );

    const matches: any[] =
        [];

    let index =
        0;

    while (
        index < rows.length &&
        index < 100
    ) {
        const row: any =
            rows[index];

        const rowGameMode =
            row.gameMode === 0
                ? gameMode
                : row.gameMode;

        const rowMatchMode =
            row.matchMode === 0
                ? matchMode
                : row.matchMode;

        if (
            isRanked
        ) {
            /*
             * Keep the already-proven ranked response shape.
             *
             * Ranked delta/badge are still temporary UI values until
             * the real post-match RankedState lifecycle exists.
             */
            matches.push({
                match_id:
                    row.matchId,

                hero_id:
                    row.heroId,

                match_duration_s:
                    row.durationS,

                start_time:
                    row.startTime,

                match_result:
                    row.matchResult,

                player_team:
                    row.playerTeam,

                player_kills:
                    row.playerKills,

                player_deaths:
                    row.playerDeaths,

                player_assists:
                    row.playerAssists,

                last_hits:
                    0,

                denies:
                    0,

                hero_level:
                    0,

                net_worth:
                    0,

                objectives_mask_team0:
                    0n,

                objectives_mask_team1:
                    0n,

                team_abandoned:
                    false,

                abandoned_time_s:
                    0,

                match_mode:
                    rowMatchMode,

                game_mode:
                    rowGameMode,

                not_scored:
                    false,

                game_mode_version:
                    1,

                player_match_outcome:
                    row.playerMatchOutcome,

                ranked_display_badge:
                    1,

                ranked_delta:
                    25,

                ranked_calibration_match:
                    0,

                ranked_used_demotion_protection:
                    false
            });
        } else {
            /*
             * Non-ranked history intentionally contains no ranked_*
             * fields. This preserves the existing V9 UI behavior.
             */
            matches.push({
                match_id:
                    row.matchId,

                hero_id:
                    row.heroId,

                match_duration_s:
                    row.durationS,

                start_time:
                    row.startTime,

                match_result:
                    row.matchResult,

                player_team:
                    row.playerTeam,

                player_kills:
                    row.playerKills,

                player_deaths:
                    row.playerDeaths,

                player_assists:
                    row.playerAssists,

                last_hits:
                    0,

                denies:
                    0,

                hero_level:
                    0,

                net_worth:
                    0,

                objectives_mask_team0:
                    0n,

                objectives_mask_team1:
                    0n,

                team_abandoned:
                    false,

                abandoned_time_s:
                    0,

                match_mode:
                    rowMatchMode,

                game_mode:
                    rowGameMode,

                not_scored:
                    false,

                game_mode_version:
                    1,

                player_match_outcome:
                    row.playerMatchOutcome
            });
        }

        index =
            index + 1;
    }

    log(
        "[9112-DB] game_mode=" +
        gameMode +
        " match_mode=" +
        matchMode +
        " ranked=" +
        isRanked +
        " source_rows=" +
        rows.length +
        " sent=" +
        matches.length
    );

    ctx.reply({
        result:
            1,

        continue_cursor:
            0n,

        matches:
            matches
    });

    log(
        "[9113-DB] sent=" +
        matches.length
    );
};

export default requestDeadlockGetMatchHistory;
