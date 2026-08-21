using Microsoft.Data.Sqlite;

namespace SKYNET_server.Services;

/// <summary>
/// SKYNET_DEADLOCK_DB_V1
///
/// Deadlock/Citadel-owned persistent state backed by deadlock.db.
///
/// Steam identity/auth/friends remain in steam.db.
/// Dota state remains in dota.db.
/// Deadlock GC progression, statistics and match state live here.
/// </summary>
public sealed class DeadlockDB : ScriptDatabase
{
    public DeadlockDB(
        IHostEnvironment environment,
        IConfiguration configuration)
        : base(
            environment,
            configuration,
            "deadlock.db")
    {
        InitializeDatabase();
    }

    protected override void Initialize()
    {
        using var connection = OpenConnection();

        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS Players (
                AccountId INTEGER PRIMARY KEY,
                SteamId INTEGER NOT NULL DEFAULT 0,
                PersonaName TEXT NOT NULL DEFAULT '',
                CreatedAtUtc TEXT NOT NULL,
                UpdatedAtUtc TEXT NOT NULL
            );
            """
        );

        Execute(
            connection,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS IX_DeadlockPlayers_SteamId
            ON Players (SteamId)
            WHERE SteamId <> 0;
            """
        );

        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS PlayerStats (
                AccountId INTEGER PRIMARY KEY,

                MatchesPlayed INTEGER NOT NULL DEFAULT 0,
                Wins INTEGER NOT NULL DEFAULT 0,
                Losses INTEGER NOT NULL DEFAULT 0,

                Kills INTEGER NOT NULL DEFAULT 0,
                Deaths INTEGER NOT NULL DEFAULT 0,
                Assists INTEGER NOT NULL DEFAULT 0,

                UpdatedAtUtc TEXT NOT NULL,

                FOREIGN KEY (AccountId)
                    REFERENCES Players(AccountId)
                    ON DELETE CASCADE
            );
            """
        );

        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS HeroStats (
                AccountId INTEGER NOT NULL,
                HeroId INTEGER NOT NULL,

                MatchesPlayed INTEGER NOT NULL DEFAULT 0,
                Wins INTEGER NOT NULL DEFAULT 0,
                Losses INTEGER NOT NULL DEFAULT 0,

                Kills INTEGER NOT NULL DEFAULT 0,
                Deaths INTEGER NOT NULL DEFAULT 0,
                Assists INTEGER NOT NULL DEFAULT 0,

                HeroXp INTEGER NOT NULL DEFAULT 0,
                BrawlWins INTEGER NOT NULL DEFAULT 0,

                UpdatedAtUtc TEXT NOT NULL,

                PRIMARY KEY (
                    AccountId,
                    HeroId
                ),

                FOREIGN KEY (AccountId)
                    REFERENCES Players(AccountId)
                    ON DELETE CASCADE
            );
            """
        );

        // SKYNET_DEADLOCK_FULL_PROFILE_STATS_DB_V1
        //
        // Full 9165 profile statistics.
        //
        // Existing columns:
        //   Kills, Deaths, Assists
        //
        // New profile-stat columns:
        //   Souls
        //   LastHits
        //   Denies
        //   Healing
        //   ObjectiveDamage
        //   HeroDamage
        //   Commends

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "Souls",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "LastHits",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "Denies",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "Healing",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "ObjectiveDamage",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "HeroDamage",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "PlayerStats",
            "Commends",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "Souls",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "LastHits",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "Denies",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "Healing",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "ObjectiveDamage",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "HeroDamage",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureStatsColumn(
            connection,
            "HeroStats",
            "Commends",
            "INTEGER NOT NULL DEFAULT 0"
        );

        /*
         * Temporary deterministic bootstrap.
         *
         * Only rows which already contain played matches and have no
         * combat/economy profile statistics are populated.
         *
         * This exists only so the current synthetic Ranked test data
         * exercises the entire profile UI.
         *
         * Future completed matches will persist real values into the
         * same columns.
         */
        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS DeadlockMigrations (
                MigrationId TEXT PRIMARY KEY,
                AppliedAtUtc TEXT NOT NULL
            );
            """
        );

        var fullProfileStatsBootstrapApplied =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM DeadlockMigrations
                    WHERE MigrationId =
                        'SKYNET_DEADLOCK_FULL_PROFILE_STATS_BOOTSTRAP_V1';
                    """
                ) ??
                0
            ) != 0;

        if (
            !fullProfileStatsBootstrapApplied
        )
        {
            var fullStatsNow =
                UtcNow();

            Execute(
                connection,
                """
                UPDATE HeroStats
                SET
                    Kills =
                        MatchesPlayed * 5,

                    Assists =
                        MatchesPlayed * 10,

                    Souls =
                        MatchesPlayed * 30000,

                    LastHits =
                        MatchesPlayed * 100,

                    Denies =
                        MatchesPlayed * 3,

                    Healing =
                        MatchesPlayed * 3000,

                    ObjectiveDamage =
                        MatchesPlayed * 6000,

                    HeroDamage =
                        MatchesPlayed * 35000,

                    Commends =
                        MatchesPlayed * 2,

                    UpdatedAtUtc =
                        $now
                WHERE
                    MatchesPlayed > 0
                    AND Kills = 0
                    AND Assists = 0
                    AND Souls = 0
                    AND LastHits = 0
                    AND Denies = 0
                    AND Healing = 0
                    AND ObjectiveDamage = 0
                    AND HeroDamage = 0
                    AND Commends = 0;
                """,
                (
                    "$now",
                    fullStatsNow
                )
            );

            /*
             * hero_id=0 / all-time row is a materialized aggregate.
             */
            Execute(
                connection,
                """
                UPDATE PlayerStats
                SET
                    Kills =
                        COALESCE(
                            (
                                SELECT SUM(h.Kills)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Assists =
                        COALESCE(
                            (
                                SELECT SUM(h.Assists)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Souls =
                        COALESCE(
                            (
                                SELECT SUM(h.Souls)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    LastHits =
                        COALESCE(
                            (
                                SELECT SUM(h.LastHits)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Denies =
                        COALESCE(
                            (
                                SELECT SUM(h.Denies)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Healing =
                        COALESCE(
                            (
                                SELECT SUM(h.Healing)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    ObjectiveDamage =
                        COALESCE(
                            (
                                SELECT SUM(h.ObjectiveDamage)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    HeroDamage =
                        COALESCE(
                            (
                                SELECT SUM(h.HeroDamage)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Commends =
                        COALESCE(
                            (
                                SELECT SUM(h.Commends)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    UpdatedAtUtc =
                        $now
                WHERE EXISTS (
                    SELECT 1
                    FROM HeroStats AS h
                    WHERE
                        h.AccountId =
                            PlayerStats.AccountId
                );
                """,
                (
                    "$now",
                    fullStatsNow
                )
            );

            Execute(
                connection,
                """
                INSERT INTO DeadlockMigrations (
                    MigrationId,
                    AppliedAtUtc
                )
                VALUES (
                    'SKYNET_DEADLOCK_FULL_PROFILE_STATS_BOOTSTRAP_V1',
                    $now
                )
                ON CONFLICT(MigrationId) DO NOTHING;
                """,
                (
                    "$now",
                    fullStatsNow
                )
            );
        }


        Execute(
            connection,
            """
            CREATE INDEX IF NOT EXISTS IX_DeadlockHeroStats_AccountWins
            ON HeroStats (
                AccountId,
                Wins DESC
            );
            """
        );

        // SKYNET_DEADLOCK_STATS_RECONCILE_V1
        //
        // One-time repair for the temporary Ranked test data.
        //
        // Final ownership model:
        //
        //   HeroStats
        //       -> per-hero materialized statistics
        //
        //   PlayerStats
        //       -> account-wide materialized aggregate
        //
        // Future real match completion must update both in the same
        // transaction. This migration is NOT a read-time aggregation.
        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS DeadlockMigrations (
                MigrationId TEXT PRIMARY KEY,
                AppliedAtUtc TEXT NOT NULL
            );
            """
        );

        var statsReconcileV1Applied =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM DeadlockMigrations
                    WHERE MigrationId =
                        'SKYNET_DEADLOCK_STATS_RECONCILE_V1';
                    """
                ) ??
                0
            ) != 0;

        if (
            !statsReconcileV1Applied
        )
        {
            var migrationNow =
                UtcNow();

            /*
             * A hero cannot have fewer played matches than recorded
             * wins + losses.
             *
             * Current synthetic Ranked seed has:
             *
             *   Wins = 20
             *   Losses = 0
             *   MatchesPlayed = 0
             *
             * so it becomes:
             *
             *   MatchesPlayed = 20
             */
            Execute(
                connection,
                """
                UPDATE HeroStats
                SET
                    MatchesPlayed =
                        Wins + Losses,

                    UpdatedAtUtc =
                        $now
                WHERE
                    MatchesPlayed <
                        (Wins + Losses);
                """,
                (
                    "$now",
                    migrationNow
                )
            );

            /*
             * PlayerStats is the account-wide materialized aggregate.
             *
             * Only accounts that actually have HeroStats rows are
             * reconciled. A fresh account with no HeroStats remains
             * untouched.
             */
            Execute(
                connection,
                """
                UPDATE PlayerStats
                SET
                    MatchesPlayed =
                        COALESCE(
                            (
                                SELECT
                                    SUM(h.MatchesPlayed)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Wins =
                        COALESCE(
                            (
                                SELECT
                                    SUM(h.Wins)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Losses =
                        COALESCE(
                            (
                                SELECT
                                    SUM(h.Losses)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Kills =
                        COALESCE(
                            (
                                SELECT
                                    SUM(h.Kills)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Deaths =
                        COALESCE(
                            (
                                SELECT
                                    SUM(h.Deaths)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Assists =
                        COALESCE(
                            (
                                SELECT
                                    SUM(h.Assists)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    UpdatedAtUtc =
                        $now
                WHERE EXISTS (
                    SELECT 1
                    FROM HeroStats AS h
                    WHERE
                        h.AccountId =
                            PlayerStats.AccountId
                );
                """,
                (
                    "$now",
                    migrationNow
                )
            );

            /*
             * Marker is written LAST.
             *
             * If the process dies before this point, all preceding
             * operations are idempotent and can safely run again.
             */
            Execute(
                connection,
                """
                INSERT INTO DeadlockMigrations (
                    MigrationId,
                    AppliedAtUtc
                )
                VALUES (
                    'SKYNET_DEADLOCK_STATS_RECONCILE_V1',
                    $now
                )
                ON CONFLICT(MigrationId) DO NOTHING;
                """,
                (
                    "$now",
                    migrationNow
                )
            );
        }

        // SKYNET_DEADLOCK_MATCHES_PLAYED_REPAIR_V2
        //
        // Separate repair from the previous stats reconciliation.
        //
        // The previous migration successfully reconciled:
        //
        //   PlayerStats.Wins = SUM(HeroStats.Wins)
        //
        // but historical test rows still have:
        //
        //   HeroStats.MatchesPlayed = 0
        //
        // despite Wins > 0.
        //
        // Repair MatchesPlayed only. Do not touch wins/ranked state.
        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS DeadlockMigrations (
                MigrationId TEXT PRIMARY KEY,
                AppliedAtUtc TEXT NOT NULL
            );
            """
        );

        var matchesPlayedRepairV2Applied =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM DeadlockMigrations
                    WHERE MigrationId =
                        'SKYNET_DEADLOCK_MATCHES_PLAYED_REPAIR_V2';
                    """
                ) ??
                0
            ) != 0;

        if (
            !matchesPlayedRepairV2Applied
        )
        {
            var matchesPlayedRepairNow =
                UtcNow();

            /*
             * Invariant:
             *
             * MatchesPlayed cannot be lower than Wins + Losses.
             *
             * Current Ranked test seed:
             *
             * hero 14:  MatchesPlayed=0 Wins=20 Losses=0
             * hero 63:  MatchesPlayed=0 Wins=20 Losses=0
             * hero 64:  MatchesPlayed=0 Wins=20 Losses=0
             *
             * becomes:
             *
             * hero 14:  20 / 20
             * hero 63:  20 / 20
             * hero 64:  20 / 20
             */
            Execute(
                connection,
                """
                UPDATE HeroStats
                SET
                    MatchesPlayed =
                        Wins + Losses,

                    UpdatedAtUtc =
                        $now
                WHERE
                    MatchesPlayed <
                        (Wins + Losses);
                """,
                (
                    "$now",
                    matchesPlayedRepairNow
                )
            );

            /*
             * Account-wide MatchesPlayed follows the same materialized
             * aggregate model as PlayerStats.Wins.
             *
             * Do NOT modify account Wins here.
             */
            Execute(
                connection,
                """
                UPDATE PlayerStats
                SET
                    MatchesPlayed =
                        COALESCE(
                            (
                                SELECT
                                    SUM(
                                        h.MatchesPlayed
                                    )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    UpdatedAtUtc =
                        $now
                WHERE EXISTS (
                    SELECT 1
                    FROM HeroStats AS h
                    WHERE
                        h.AccountId =
                            PlayerStats.AccountId
                );
                """,
                (
                    "$now",
                    matchesPlayedRepairNow
                )
            );

            /*
             * Marker LAST.
             */
            Execute(
                connection,
                """
                INSERT INTO DeadlockMigrations (
                    MigrationId,
                    AppliedAtUtc
                )
                VALUES (
                    'SKYNET_DEADLOCK_MATCHES_PLAYED_REPAIR_V2',
                    $now
                )
                ON CONFLICT(MigrationId) DO NOTHING;
                """,
                (
                    "$now",
                    matchesPlayedRepairNow
                )
            );
        }


        // SKYNET_DEADLOCK_DISTINCT_HERO_PROFILE_STATS_V2
        //
        // Replace ONLY the exact old V1 synthetic profile-stat rows.
        //
        // HeroId is intentionally used as a deterministic variation
        // source so different heroes no longer display identical
        // all-time statistics.
        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS DeadlockMigrations (
                MigrationId TEXT PRIMARY KEY,
                AppliedAtUtc TEXT NOT NULL
            );
            """
        );

        var distinctHeroProfileStatsV2Applied =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM DeadlockMigrations
                    WHERE MigrationId =
                        'SKYNET_DEADLOCK_DISTINCT_HERO_PROFILE_STATS_V2';
                    """
                ) ??
                0
            ) != 0;

        if (
            !distinctHeroProfileStatsV2Applied
        )
        {
            var distinctStatsNow =
                UtcNow();

            /*
             * V1 fingerprint guard is deliberately strict.
             *
             * If even one field has already been replaced by real
             * gameplay data, this migration leaves the row alone.
             */
            Execute(
                connection,
                """
                UPDATE HeroStats
                SET
                    /*
                     * 4-7 kills / match depending on HeroId.
                     */
                    Kills =
                        MatchesPlayed *
                        (
                            4 +
                            (HeroId % 4)
                        ),

                    /*
                     * 7-12 assists / match.
                     */
                    Assists =
                        MatchesPlayed *
                        (
                            7 +
                            (HeroId % 6)
                        ),

                    /*
                     * Economy varies strongly between heroes.
                     */
                    Souls =
                        MatchesPlayed *
                        (
                            25000 +
                            (
                                (HeroId % 9) *
                                2500
                            )
                        ),

                    /*
                     * 80..146-ish last hits / match.
                     */
                    LastHits =
                        MatchesPlayed *
                        (
                            80 +
                            (
                                (HeroId % 23) *
                                3
                            )
                        ),

                    /*
                     * Hero-specific denies.
                     */
                    Denies =
                        MatchesPlayed *
                        (
                            1 +
                            (HeroId % 11)
                        ),

                    /*
                     * Healing deliberately varies a lot between
                     * different heroes.
                     */
                    Healing =
                        MatchesPlayed *
                        (
                            1500 +
                            (
                                (HeroId % 13) *
                                900
                            )
                        ),

                    ObjectiveDamage =
                        MatchesPlayed *
                        (
                            2500 +
                            (
                                (HeroId % 17) *
                                500
                            )
                        ),

                    HeroDamage =
                        MatchesPlayed *
                        (
                            25000 +
                            (
                                (HeroId % 19) *
                                1500
                            )
                        ),

                    Commends =
                        MatchesPlayed *
                        (
                            1 +
                            (HeroId % 13)
                        ),

                    UpdatedAtUtc =
                        $now

                WHERE
                    HeroId <> 0
                    AND MatchesPlayed > 0

                    /*
                     * Exact V1 synthetic fingerprint.
                     */
                    AND Kills =
                        MatchesPlayed * 5

                    AND Assists =
                        MatchesPlayed * 10

                    AND Souls =
                        MatchesPlayed * 30000

                    AND LastHits =
                        MatchesPlayed * 100

                    AND Denies =
                        MatchesPlayed * 3

                    AND Healing =
                        MatchesPlayed * 3000

                    AND ObjectiveDamage =
                        MatchesPlayed * 6000

                    AND HeroDamage =
                        MatchesPlayed * 35000

                    AND Commends =
                        MatchesPlayed * 2;
                """,
                (
                    "$now",
                    distinctStatsNow
                )
            );

            /*
             * Rebuild the hero_id=0 / "All Heroes" materialized row.
             *
             * Wins, losses and MatchesPlayed are intentionally not
             * changed here: they already use the proven aggregate.
             */
            Execute(
                connection,
                """
                UPDATE PlayerStats
                SET
                    Kills =
                        COALESCE(
                            (
                                SELECT SUM(h.Kills)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Assists =
                        COALESCE(
                            (
                                SELECT SUM(h.Assists)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Souls =
                        COALESCE(
                            (
                                SELECT SUM(h.Souls)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    LastHits =
                        COALESCE(
                            (
                                SELECT SUM(h.LastHits)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Denies =
                        COALESCE(
                            (
                                SELECT SUM(h.Denies)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Healing =
                        COALESCE(
                            (
                                SELECT SUM(h.Healing)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    ObjectiveDamage =
                        COALESCE(
                            (
                                SELECT
                                    SUM(
                                        h.ObjectiveDamage
                                    )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    HeroDamage =
                        COALESCE(
                            (
                                SELECT
                                    SUM(
                                        h.HeroDamage
                                    )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Commends =
                        COALESCE(
                            (
                                SELECT SUM(h.Commends)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    UpdatedAtUtc =
                        $now

                WHERE EXISTS (
                    SELECT 1
                    FROM HeroStats AS h
                    WHERE
                        h.AccountId =
                            PlayerStats.AccountId
                );
                """,
                (
                    "$now",
                    distinctStatsNow
                )
            );

            /*
             * Marker LAST.
             */
            Execute(
                connection,
                """
                INSERT INTO DeadlockMigrations (
                    MigrationId,
                    AppliedAtUtc
                )
                VALUES (
                    'SKYNET_DEADLOCK_DISTINCT_HERO_PROFILE_STATS_V2',
                    $now
                )
                ON CONFLICT(MigrationId) DO NOTHING;
                """,
                (
                    "$now",
                    distinctStatsNow
                )
            );
        }


        // SKYNET_DEADLOCK_DISTINCT_HERO_MATCH_COUNTS_V3
        //
        // Current Ranked bootstrap used identical:
        //
        //   MatchesPlayed = 30
        //   Wins          = 20
        //   Losses        = 10
        //
        // for all three heroes.
        //
        // V3 varies Losses deterministically by HeroId:
        //
        //   Losses = 9 + (HeroId % 3)
        //
        // Therefore for current HeroIds:
        //
        //   14 -> 11 losses -> 31 games
        //   63 ->  9 losses -> 29 games
        //   64 -> 10 losses -> 30 games
        //
        // Total remains exactly:
        //
        //   Wins   = 60
        //   Losses = 30
        //   Games  = 90
        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS DeadlockMigrations (
                MigrationId TEXT PRIMARY KEY,
                AppliedAtUtc TEXT NOT NULL
            );
            """
        );

        var distinctHeroMatchCountsV3Applied =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM DeadlockMigrations
                    WHERE MigrationId =
                        'SKYNET_DEADLOCK_DISTINCT_HERO_MATCH_COUNTS_V3';
                    """
                ) ??
                0
            ) != 0;

        if (
            !distinctHeroMatchCountsV3Applied
        )
        {
            var distinctMatchNow =
                UtcNow();

            /*
             * STRICT V2 synthetic fingerprint.
             *
             * Real rows are not modified.
             */
            Execute(
                connection,
                """
                UPDATE HeroStats
                SET
                    Losses =
                        9 +
                        (HeroId % 3),

                    MatchesPlayed =
                        Wins +
                        9 +
                        (HeroId % 3),

                    /*
                     * Recalculate V2 synthetic values against the
                     * new distinct match count.
                     */
                    Kills =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            4 +
                            (HeroId % 4)
                        ),

                    Assists =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            7 +
                            (HeroId % 6)
                        ),

                    Souls =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            25000 +
                            (
                                (HeroId % 9) *
                                2500
                            )
                        ),

                    LastHits =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            80 +
                            (
                                (HeroId % 23) *
                                3
                            )
                        ),

                    Denies =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            1 +
                            (HeroId % 11)
                        ),

                    Healing =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            1500 +
                            (
                                (HeroId % 13) *
                                900
                            )
                        ),

                    ObjectiveDamage =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            2500 +
                            (
                                (HeroId % 17) *
                                500
                            )
                        ),

                    HeroDamage =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            25000 +
                            (
                                (HeroId % 19) *
                                1500
                            )
                        ),

                    Commends =
                        (
                            Wins +
                            9 +
                            (HeroId % 3)
                        ) *
                        (
                            1 +
                            (HeroId % 13)
                        ),

                    UpdatedAtUtc =
                        $now

                WHERE
                    HeroId <> 0

                    /*
                     * Original Ranked seed.
                     */
                    AND MatchesPlayed = 30
                    AND Wins = 20
                    AND Losses = 10

                    /*
                     * Exact V2 synthetic fingerprint.
                     */
                    AND Kills =
                        MatchesPlayed *
                        (
                            4 +
                            (HeroId % 4)
                        )

                    AND Assists =
                        MatchesPlayed *
                        (
                            7 +
                            (HeroId % 6)
                        )

                    AND Souls =
                        MatchesPlayed *
                        (
                            25000 +
                            (
                                (HeroId % 9) *
                                2500
                            )
                        )

                    AND LastHits =
                        MatchesPlayed *
                        (
                            80 +
                            (
                                (HeroId % 23) *
                                3
                            )
                        )

                    AND Denies =
                        MatchesPlayed *
                        (
                            1 +
                            (HeroId % 11)
                        )

                    AND Healing =
                        MatchesPlayed *
                        (
                            1500 +
                            (
                                (HeroId % 13) *
                                900
                            )
                        )

                    AND ObjectiveDamage =
                        MatchesPlayed *
                        (
                            2500 +
                            (
                                (HeroId % 17) *
                                500
                            )
                        )

                    AND HeroDamage =
                        MatchesPlayed *
                        (
                            25000 +
                            (
                                (HeroId % 19) *
                                1500
                            )
                        )

                    AND Commends =
                        MatchesPlayed *
                        (
                            1 +
                            (HeroId % 13)
                        );
                """,
                (
                    "$now",
                    distinctMatchNow
                )
            );

            /*
             * PlayerStats remains materialized "All Heroes".
             */
            Execute(
                connection,
                """
                UPDATE PlayerStats
                SET
                    MatchesPlayed =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.MatchesPlayed
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Wins =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.Wins
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Losses =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.Losses
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Kills =
                        COALESCE(
                            (
                                SELECT SUM(h.Kills)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Assists =
                        COALESCE(
                            (
                                SELECT SUM(h.Assists)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Souls =
                        COALESCE(
                            (
                                SELECT SUM(h.Souls)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    LastHits =
                        COALESCE(
                            (
                                SELECT SUM(h.LastHits)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Denies =
                        COALESCE(
                            (
                                SELECT SUM(h.Denies)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Healing =
                        COALESCE(
                            (
                                SELECT SUM(h.Healing)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    ObjectiveDamage =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.ObjectiveDamage
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    HeroDamage =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.HeroDamage
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Commends =
                        COALESCE(
                            (
                                SELECT SUM(h.Commends)
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    UpdatedAtUtc =
                        $now

                WHERE EXISTS (
                    SELECT 1
                    FROM HeroStats AS h
                    WHERE
                        h.AccountId =
                            PlayerStats.AccountId
                );
                """,
                (
                    "$now",
                    distinctMatchNow
                )
            );

            /*
             * Migration marker LAST.
             */
            Execute(
                connection,
                """
                INSERT INTO DeadlockMigrations (
                    MigrationId,
                    AppliedAtUtc
                )
                VALUES (
                    'SKYNET_DEADLOCK_DISTINCT_HERO_MATCH_COUNTS_V3',
                    $now
                )
                ON CONFLICT(MigrationId) DO NOTHING;
                """,
                (
                    "$now",
                    distinctMatchNow
                )
            );
        }


        // SKYNET_DEADLOCK_DISTINCT_HERO_WINS_V4
        //
        // Diversify Wins for the exact current synthetic Ranked seed.
        //
        // Before:
        //
        //   hero 14 -> 31 / 20 / 11
        //   hero 63 -> 29 / 20 /  9
        //   hero 64 -> 30 / 20 / 10
        //
        // After:
        //
        //   hero 14 -> 31 / 18 / 13
        //   hero 63 -> 29 / 20 /  9
        //   hero 64 -> 30 / 22 /  8
        //
        // Totals remain:
        //
        //   MatchesPlayed = 90
        //   Wins          = 60
        //   Losses        = 30
        //
        // All three heroes still satisfy Wins >= 15.

        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS DeadlockMigrations (
                MigrationId TEXT PRIMARY KEY,
                AppliedAtUtc TEXT NOT NULL
            );
            """
        );

        var distinctHeroWinsV4Applied =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM DeadlockMigrations
                    WHERE MigrationId =
                        'SKYNET_DEADLOCK_DISTINCT_HERO_WINS_V4';
                    """
                ) ??
                0
            ) != 0;

        if (
            !distinctHeroWinsV4Applied
        )
        {
            var distinctHeroWinsNow =
                UtcNow();

            /*
             * Update ONLY accounts that still contain the complete
             * exact V3 synthetic trio.
             *
             * This avoids modifying future real HeroStats.
             */
            Execute(
                connection,
                """
                UPDATE HeroStats
                SET
                    Wins =
                        CASE HeroId
                            WHEN 14 THEN 18
                            WHEN 63 THEN 20
                            WHEN 64 THEN 22
                            ELSE Wins
                        END,

                    Losses =
                        MatchesPlayed -
                        CASE HeroId
                            WHEN 14 THEN 18
                            WHEN 63 THEN 20
                            WHEN 64 THEN 22
                            ELSE Wins
                        END,

                    UpdatedAtUtc =
                        $now

                WHERE
                    HeroId IN (
                        14,
                        63,
                        64
                    )

                    /*
                     * Exact individual V3 rows.
                     */
                    AND (
                        (
                            HeroId = 14
                            AND MatchesPlayed = 31
                            AND Wins = 20
                            AND Losses = 11
                        )

                        OR

                        (
                            HeroId = 63
                            AND MatchesPlayed = 29
                            AND Wins = 20
                            AND Losses = 9
                        )

                        OR

                        (
                            HeroId = 64
                            AND MatchesPlayed = 30
                            AND Wins = 20
                            AND Losses = 10
                        )
                    )

                    /*
                     * Account must contain the WHOLE expected trio,
                     * not merely one coincidentally matching row.
                     */
                    AND (
                        SELECT COUNT(*)
                        FROM HeroStats AS verifyHero
                        WHERE
                            verifyHero.AccountId =
                                HeroStats.AccountId

                            AND (
                                (
                                    verifyHero.HeroId = 14
                                    AND verifyHero.MatchesPlayed = 31
                                    AND verifyHero.Wins = 20
                                    AND verifyHero.Losses = 11
                                )

                                OR

                                (
                                    verifyHero.HeroId = 63
                                    AND verifyHero.MatchesPlayed = 29
                                    AND verifyHero.Wins = 20
                                    AND verifyHero.Losses = 9
                                )

                                OR

                                (
                                    verifyHero.HeroId = 64
                                    AND verifyHero.MatchesPlayed = 30
                                    AND verifyHero.Wins = 20
                                    AND verifyHero.Losses = 10
                                )
                            )
                    ) = 3;
                """,
                (
                    "$now",
                    distinctHeroWinsNow
                )
            );

            /*
             * Rebuild the global PlayerStats aggregate.
             *
             * Extended profile statistics do not need recalculation:
             * MatchesPlayed and HeroId did not change, therefore the
             * existing V2/V3 synthetic values remain internally
             * consistent.
             */
            Execute(
                connection,
                """
                UPDATE PlayerStats
                SET
                    MatchesPlayed =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.MatchesPlayed
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Wins =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.Wins
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    Losses =
                        COALESCE(
                            (
                                SELECT SUM(
                                    h.Losses
                                )
                                FROM HeroStats AS h
                                WHERE
                                    h.AccountId =
                                        PlayerStats.AccountId
                            ),
                            0
                        ),

                    UpdatedAtUtc =
                        $now

                WHERE EXISTS (
                    SELECT 1
                    FROM HeroStats AS h
                    WHERE
                        h.AccountId =
                            PlayerStats.AccountId

                        AND h.HeroId IN (
                            14,
                            63,
                            64
                        )
                );
                """,
                (
                    "$now",
                    distinctHeroWinsNow
                )
            );

            /*
             * Marker LAST.
             */
            Execute(
                connection,
                """
                INSERT INTO DeadlockMigrations (
                    MigrationId,
                    AppliedAtUtc
                )
                VALUES (
                    'SKYNET_DEADLOCK_DISTINCT_HERO_WINS_V4',
                    $now
                )
                ON CONFLICT(MigrationId) DO NOTHING;
                """,
                (
                    "$now",
                    distinctHeroWinsNow
                )
            );
        }


        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS RankedState (
                AccountId INTEGER PRIMARY KEY,

                RankType INTEGER NOT NULL DEFAULT 0,
                RankInterval INTEGER NOT NULL DEFAULT 0,
                RankBadge INTEGER NOT NULL DEFAULT 0,

                RankConfidence INTEGER NOT NULL DEFAULT 0,
                CalibrationProgress INTEGER NOT NULL DEFAULT 0,
                InCalibration INTEGER NOT NULL DEFAULT 0,

                MatchCount INTEGER NOT NULL DEFAULT 0,
                WinBitMask INTEGER NOT NULL DEFAULT 0,

                UpdatedAtUtc TEXT NOT NULL,

                FOREIGN KEY (AccountId)
                    REFERENCES Players(AccountId)
                    ON DELETE CASCADE
            );
            """
        );

        // SKYNET_DEADLOCK_RANKED_DB_SCHEMA_V1
        //
        // Fields required by CSORankedProgress (SO type 112).
        // Existing RankedState columns are preserved.
        EnsureRankedStateColumn(
            connection,
            "Progress",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "MaxProgress",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "RankValue",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "MaxRank",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "LeaderboardRank",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "MaxLeaderboardRank",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "DemoteProtectGames",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "CalibrateGames",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "LastMatchHeroId",
            "INTEGER NOT NULL DEFAULT 0"
        );

        EnsureRankedStateColumn(
            connection,
            "LastMatchOutcome",
            "INTEGER NOT NULL DEFAULT 0"
        );

        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS Matches (
                MatchId INTEGER PRIMARY KEY,
                LobbyId INTEGER NOT NULL DEFAULT 0,

                GameMode INTEGER NOT NULL DEFAULT 0,
                MatchMode INTEGER NOT NULL DEFAULT 0,

                WinningTeam INTEGER NOT NULL DEFAULT 0,

                StartedAtUtc TEXT NOT NULL DEFAULT '',
                EndedAtUtc TEXT NOT NULL DEFAULT '',

                CreatedAtUtc TEXT NOT NULL
            );
            """
        );

        Execute(
            connection,
            """
            CREATE TABLE IF NOT EXISTS MatchPlayers (
                MatchId INTEGER NOT NULL,
                AccountId INTEGER NOT NULL,
                SteamId INTEGER NOT NULL DEFAULT 0,

                HeroId INTEGER NOT NULL DEFAULT 0,
                Team INTEGER NOT NULL DEFAULT 0,

                Kills INTEGER NOT NULL DEFAULT 0,
                Deaths INTEGER NOT NULL DEFAULT 0,
                Assists INTEGER NOT NULL DEFAULT 0,

                Won INTEGER NOT NULL DEFAULT 0,

                PRIMARY KEY (
                    MatchId,
                    AccountId
                ),

                FOREIGN KEY (MatchId)
                    REFERENCES Matches(MatchId)
                    ON DELETE CASCADE
            );
            """
        );

        Execute(
            connection,
            """
            CREATE INDEX IF NOT EXISTS IX_DeadlockMatchPlayers_AccountId
            ON MatchPlayers (
                AccountId,
                MatchId DESC
            );
            """
        );
    }

    internal void EnsurePlayer(
        ulong steamId,
        uint accountId,
        string personaName)
    {
        if (accountId == 0)
        {
            return;
        }

        var now = UtcNow();

        using var connection = OpenConnection();

        Execute(
            connection,
            """
            INSERT INTO Players (
                AccountId,
                SteamId,
                PersonaName,
                CreatedAtUtc,
                UpdatedAtUtc
            )
            VALUES (
                $accountId,
                $steamId,
                $personaName,
                $now,
                $now
            )
            ON CONFLICT(AccountId) DO UPDATE SET
                SteamId = CASE
                    WHEN excluded.SteamId <> 0
                    THEN excluded.SteamId
                    ELSE Players.SteamId
                END,
                PersonaName = CASE
                    WHEN excluded.PersonaName <> ''
                    THEN excluded.PersonaName
                    ELSE Players.PersonaName
                END,
                UpdatedAtUtc = excluded.UpdatedAtUtc;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$steamId",
                steamId
            ),
            (
                "$personaName",
                personaName ?? string.Empty
            ),
            (
                "$now",
                now
            )
        );

        Execute(
            connection,
            """
            INSERT INTO PlayerStats (
                AccountId,
                UpdatedAtUtc
            )
            VALUES (
                $accountId,
                $now
            )
            ON CONFLICT(AccountId) DO NOTHING;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$now",
                now
            )
        );

        Execute(
            connection,
            """
            INSERT INTO RankedState (
                AccountId,
                UpdatedAtUtc
            )
            VALUES (
                $accountId,
                $now
            )
            ON CONFLICT(AccountId) DO NOTHING;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$now",
                now
            )
        );
    }

    internal string GetPlayer(
        uint accountId)
    {
        using var connection = OpenConnection();

        using var command =
            connection.CreateCommand();

        command.CommandText =
            """
            SELECT
                AccountId,
                SteamId,
                PersonaName,
                CreatedAtUtc,
                UpdatedAtUtc
            FROM Players
            WHERE AccountId = $accountId;
            """;

        command.Parameters.AddWithValue(
            "$accountId",
            accountId
        );

        using var reader =
            command.ExecuteReader();

        if (
            !reader.Read()
        )
        {
            return "{}";
        }

        return Json(
            new
            {
                accountId =
                    Convert.ToUInt32(
                        reader.GetInt64(0)
                    ),

                steamId =
                    Convert.ToUInt64(
                        reader.GetInt64(1)
                    ),

                personaName =
                    reader.GetString(2),

                createdAtUtc =
                    reader.GetString(3),

                updatedAtUtc =
                    reader.GetString(4)
            }
        );
    }

    internal string GetAccountStats(
        uint accountId)
    {
        using var connection = OpenConnection();

        using var command =
            connection.CreateCommand();

        command.CommandText =
            """
            SELECT
                MatchesPlayed,
                Wins,
                Losses,
                Kills,
                Deaths,
                Assists,
                UpdatedAtUtc
            FROM PlayerStats
            WHERE AccountId = $accountId;
            """;

        command.Parameters.AddWithValue(
            "$accountId",
            accountId
        );

        using var reader =
            command.ExecuteReader();

        if (
            !reader.Read()
        )
        {
            return "{}";
        }

        return Json(
            new
            {
                accountId,

                matchesPlayed =
                    Convert.ToUInt32(
                        reader.GetInt64(0)
                    ),

                wins =
                    Convert.ToUInt32(
                        reader.GetInt64(1)
                    ),

                losses =
                    Convert.ToUInt32(
                        reader.GetInt64(2)
                    ),

                kills =
                    Convert.ToUInt32(
                        reader.GetInt64(3)
                    ),

                deaths =
                    Convert.ToUInt32(
                        reader.GetInt64(4)
                    ),

                assists =
                    Convert.ToUInt32(
                        reader.GetInt64(5)
                    ),

                updatedAtUtc =
                    reader.GetString(6)
            }
        );
    }

    internal string GetHeroStats(
        uint accountId)
    {
        var result =
            new List<object>();

        using var connection = OpenConnection();

        using var command =
            connection.CreateCommand();

        command.CommandText =
            """
            SELECT
                HeroId,
                MatchesPlayed,
                Wins,
                Losses,
                Kills,
                Deaths,
                Assists,
                HeroXp,
                BrawlWins,
                UpdatedAtUtc
            FROM HeroStats
            WHERE AccountId = $accountId
            ORDER BY
                Wins DESC,
                MatchesPlayed DESC,
                HeroId ASC;
            """;

        command.Parameters.AddWithValue(
            "$accountId",
            accountId
        );

        using var reader =
            command.ExecuteReader();

        while (
            reader.Read()
        )
        {
            result.Add(
                new
                {
                    accountId,

                    heroId =
                        Convert.ToUInt32(
                            reader.GetInt64(0)
                        ),

                    matchesPlayed =
                        Convert.ToUInt32(
                            reader.GetInt64(1)
                        ),

                    wins =
                        Convert.ToUInt32(
                            reader.GetInt64(2)
                        ),

                    losses =
                        Convert.ToUInt32(
                            reader.GetInt64(3)
                        ),

                    kills =
                        Convert.ToUInt32(
                            reader.GetInt64(4)
                        ),

                    deaths =
                        Convert.ToUInt32(
                            reader.GetInt64(5)
                        ),

                    assists =
                        Convert.ToUInt32(
                            reader.GetInt64(6)
                        ),

                    heroXp =
                        Convert.ToUInt32(
                            reader.GetInt64(7)
                        ),

                    brawlWins =
                        Convert.ToUInt32(
                            reader.GetInt64(8)
                        ),

                    updatedAtUtc =
                        reader.GetString(9)
                }
            );
        }

        return Json(
            result
        );
    }

    internal void SetAccountStats(
        uint accountId,
        uint matchesPlayed,
        uint wins,
        uint losses)
    {
        if (accountId == 0)
        {
            return;
        }

        using var connection = OpenConnection();

        Execute(
            connection,
            """
            INSERT INTO PlayerStats (
                AccountId,
                MatchesPlayed,
                Wins,
                Losses,
                UpdatedAtUtc
            )
            VALUES (
                $accountId,
                $matchesPlayed,
                $wins,
                $losses,
                $now
            )
            ON CONFLICT(AccountId) DO UPDATE SET
                MatchesPlayed = excluded.MatchesPlayed,
                Wins = excluded.Wins,
                Losses = excluded.Losses,
                UpdatedAtUtc = excluded.UpdatedAtUtc;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$matchesPlayed",
                matchesPlayed
            ),
            (
                "$wins",
                wins
            ),
            (
                "$losses",
                losses
            ),
            (
                "$now",
                UtcNow()
            )
        );
    }

    internal void UpsertHeroStats(
        uint accountId,
        uint heroId,
        uint matchesPlayed,
        uint wins,
        uint losses,
        uint heroXp = 0,
        uint brawlWins = 0)
    {
        if (
            accountId == 0 ||
            heroId == 0
        )
        {
            return;
        }

        using var connection = OpenConnection();

        Execute(
            connection,
            """
            INSERT INTO HeroStats (
                AccountId,
                HeroId,
                MatchesPlayed,
                Wins,
                Losses,
                HeroXp,
                BrawlWins,
                UpdatedAtUtc
            )
            VALUES (
                $accountId,
                $heroId,
                $matchesPlayed,
                $wins,
                $losses,
                $heroXp,
                $brawlWins,
                $now
            )
            ON CONFLICT(AccountId, HeroId) DO UPDATE SET
                MatchesPlayed = excluded.MatchesPlayed,
                Wins = excluded.Wins,
                Losses = excluded.Losses,
                HeroXp = excluded.HeroXp,
                BrawlWins = excluded.BrawlWins,
                UpdatedAtUtc = excluded.UpdatedAtUtc;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$heroId",
                heroId
            ),
            (
                "$matchesPlayed",
                matchesPlayed
            ),
            (
                "$wins",
                wins
            ),
            (
                "$losses",
                losses
            ),
            (
                "$heroXp",
                heroXp
            ),
            (
                "$brawlWins",
                brawlWins
            ),
            (
                "$now",
                UtcNow()
            )
        );
    }

    internal string GetRankedEligibility(
        uint accountId)
    {
        using var connection = OpenConnection();

        var wins =
            Convert.ToUInt32(
                Scalar(
                    connection,
                    """
                    SELECT COALESCE(
                        (
                            SELECT Wins
                            FROM PlayerStats
                            WHERE AccountId = $accountId
                        ),
                        0
                    );
                    """,
                    (
                        "$accountId",
                        accountId
                    )
                ) ??
                0
            );

        var heroesWith15Wins =
            Convert.ToUInt32(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM HeroStats
                    WHERE
                        AccountId = $accountId
                        AND Wins >= 15;
                    """,
                    (
                        "$accountId",
                        accountId
                    )
                ) ??
                0
            );

        return Json(
            new
            {
                accountId,

                normalWins =
                    wins,

                requiredNormalWins =
                    60,

                heroesWith15Wins,

                requiredHeroesWith15Wins =
                    3,

                eligible =
                    wins >= 60 &&
                    heroesWith15Wins >= 3
            }
        );
    }



    // SKYNET_DEADLOCK_MATCH_HISTORY_DB_V1
    //
    // Canonical account-scoped source for GC 9112/9113.
    //
    // Priority:
    //
    //   1. Real Matches + MatchPlayers rows.
    //   2. Temporary bootstrap history generated from THIS account's
    //      HeroStats.Wins when no real match rows exist yet.
    //
    // Once real match lifecycle persistence is implemented, the fallback
    // automatically stops being used for that account.
    internal string GetMatchHistory(
        uint accountId)
    {
        var result =
            new List<object>();

        if (
            accountId == 0
        )
        {
            return Json(
                result
            );
        }

        static long ParseUnixTime(
            string value)
        {
            if (
                string.IsNullOrWhiteSpace(
                    value
                )
            )
            {
                return 0;
            }

            if (
                System.DateTimeOffset.TryParse(
                    value,
                    out var parsed
                )
            )
            {
                return parsed
                    .ToUnixTimeSeconds();
            }

            return 0;
        }

        using var connection =
            OpenConnection();

        /*
         * First choice: real persisted matches.
         */
        using (
            var command =
                connection.CreateCommand()
        )
        {
            command.CommandText =
                """
                SELECT
                    m.MatchId,
                    mp.HeroId,
                    mp.Team,
                    mp.Kills,
                    mp.Deaths,
                    mp.Assists,
                    mp.Won,
                    m.GameMode,
                    m.MatchMode,
                    m.WinningTeam,
                    m.StartedAtUtc,
                    m.EndedAtUtc,
                    m.CreatedAtUtc
                FROM MatchPlayers AS mp
                INNER JOIN Matches AS m
                    ON m.MatchId = mp.MatchId
                WHERE
                    mp.AccountId = $accountId
                ORDER BY
                    m.MatchId DESC
                LIMIT 100;
                """;

            command.Parameters.AddWithValue(
                "$accountId",
                accountId
            );

            using var reader =
                command.ExecuteReader();

            while (
                reader.Read()
            )
            {
                var startedAt =
                    reader.IsDBNull(10)
                        ? ""
                        : reader.GetString(10);

                var endedAt =
                    reader.IsDBNull(11)
                        ? ""
                        : reader.GetString(11);

                var createdAt =
                    reader.IsDBNull(12)
                        ? ""
                        : reader.GetString(12);

                var startTime =
                    ParseUnixTime(
                        startedAt
                    );

                if (
                    startTime <= 0
                )
                {
                    startTime =
                        ParseUnixTime(
                            createdAt
                        );
                }

                var endTime =
                    ParseUnixTime(
                        endedAt
                    );

                long duration =
                    1800;

                if (
                    startTime > 0 &&
                    endTime > startTime
                )
                {
                    duration =
                        endTime -
                        startTime;
                }

                if (
                    duration < 0
                )
                {
                    duration = 0;
                }

                if (
                    duration >
                    int.MaxValue
                )
                {
                    duration =
                        int.MaxValue;
                }

                var won =
                    reader.GetInt64(6) !=
                    0;

                var matchResult =
                    won
                        ? 1u
                        : 2u;

                result.Add(
                    new
                    {
                        matchId =
                            reader.GetInt64(0),

                        heroId =
                            Convert.ToUInt32(
                                reader.GetInt64(1)
                            ),

                        durationS =
                            Convert.ToUInt32(
                                duration
                            ),

                        startTime,

                        matchResult,

                        playerTeam =
                            Convert.ToUInt32(
                                reader.GetInt64(2)
                            ),

                        playerKills =
                            Convert.ToUInt32(
                                reader.GetInt64(3)
                            ),

                        playerDeaths =
                            Convert.ToUInt32(
                                reader.GetInt64(4)
                            ),

                        playerAssists =
                            Convert.ToUInt32(
                                reader.GetInt64(5)
                            ),

                        gameMode =
                            Convert.ToUInt32(
                                reader.GetInt64(7)
                            ),

                        matchMode =
                            Convert.ToUInt32(
                                reader.GetInt64(8)
                            ),

                        winningTeam =
                            Convert.ToUInt32(
                                reader.GetInt64(9)
                            ),

                        playerMatchOutcome =
                            matchResult,

                        bootstrap =
                            false
                    }
                );
            }
        }

        if (
            result.Count > 0
        )
        {
            return Json(
                result
            );
        }

        /*
         * Temporary bootstrap.
         *
         * No global 3 x 20 generator exists here.
         * Only HeroStats belonging to accountId are used.
         *
         * Example:
         *
         *   Account A: 20 + 20 + 20 wins -> 60 history rows.
         *   Account B: no HeroStats wins -> 0 history rows.
         */
        var bootstrapBaseTime =
            System.DateTimeOffset
                .UtcNow
                .ToUnixTimeSeconds();

        var serial =
            0;

        using (
            var heroCommand =
                connection.CreateCommand()
        )
        {
            heroCommand.CommandText =
                """
                SELECT
                    HeroId,
                    Wins,
                    UpdatedAtUtc
                FROM HeroStats
                WHERE
                    AccountId = $accountId
                    AND HeroId <> 0
                    AND Wins > 0
                ORDER BY
                    Wins DESC,
                    HeroId ASC;
                """;

            heroCommand.Parameters.AddWithValue(
                "$accountId",
                accountId
            );

            using var heroReader =
                heroCommand.ExecuteReader();

            while (
                heroReader.Read() &&
                result.Count < 100
            )
            {
                var heroId =
                    Convert.ToUInt32(
                        heroReader.GetInt64(0)
                    );

                var wins =
                    Convert.ToUInt32(
                        heroReader.GetInt64(1)
                    );

                var updatedAt =
                    heroReader.IsDBNull(2)
                        ? ""
                        : heroReader.GetString(2);

                var heroTimestamp =
                    ParseUnixTime(
                        updatedAt
                    );

                if (
                    heroTimestamp > 0 &&
                    heroTimestamp <
                        bootstrapBaseTime
                )
                {
                    /*
                     * Keep the global bootstrap base recent, but preserve
                     * deterministic ordering between hero rows.
                     */
                }

                uint winIndex =
                    0;

                while (
                    winIndex < wins &&
                    result.Count < 100
                )
                {
                    serial =
                        serial + 1;

                    var syntheticMatchId =
                        8_000_000_000_000_000L +
                        (
                            (long)accountId *
                            1_000_000L
                        ) +
                        serial;

                    var startTime =
                        bootstrapBaseTime -
                        (
                            serial *
                            3600L
                        );

                    result.Add(
                        new
                        {
                            matchId =
                                syntheticMatchId,

                            heroId,

                            durationS =
                                Convert.ToUInt32(
                                    1800 +
                                    serial
                                ),

                            startTime,

                            matchResult =
                                1u,

                            playerTeam =
                                0u,

                            playerKills =
                                0u,

                            playerDeaths =
                                0u,

                            playerAssists =
                                0u,

                            gameMode =
                                1u,

                            matchMode =
                                1u,

                            winningTeam =
                                0u,

                            playerMatchOutcome =
                                1u,

                            bootstrap =
                                true
                        }
                    );

                    winIndex =
                        winIndex + 1;
                }
            }
        }

        return Json(
            result
        );
    }


    // SKYNET_DEADLOCK_RANKED_DB_SOCACHE_V1
    //
    // Canonical DB-backed source for:
    //
    //   PlayerStats -> account-wide normal wins
    //   HeroStats   -> SO type 107 / CSOAccountHeroInfo
    //   RankedState -> SO type 112 / CSORankedProgress
    //
    internal string GetRankedSocacheSnapshot(
        uint accountId)
    {
        if (
            accountId == 0
        )
        {
            return "{}";
        }

        using var connection =
            OpenConnection();

        var playerExists =
            Convert.ToInt64(
                Scalar(
                    connection,
                    """
                    SELECT COUNT(*)
                    FROM Players
                    WHERE AccountId = $accountId;
                    """,
                    (
                        "$accountId",
                        accountId
                    )
                ) ??
                0
            ) > 0;

        if (
            !playerExists
        )
        {
            return "{}";
        }

        /*
         * SKYNET_DEADLOCK_RANKED_CALIBRATION_ACCOUNT_ISOLATION_V1
         *
         * RankedState is created BLANK for every account.
         *
         * Do not assign calibration merely because the player exists.
         * The eligibility-gated UPDATE below is responsible for
         * starting calibration.
         *
         * Also repair the exact old synthetic calibration state when
         * it was accidentally assigned to a non-eligible account.
         */
        Execute(
            connection,
            """
            UPDATE RankedState
            SET
                RankType = 0,
                RankInterval = 0,
                RankBadge = 0,
                RankConfidence = 0,
                CalibrationProgress = 0,
                InCalibration = 0,
                MatchCount = 0,
                WinBitMask = 0,
                Progress = 0,
                MaxProgress = 0,
                RankValue = 0,
                MaxRank = 0,
                LeaderboardRank = 0,
                MaxLeaderboardRank = 0,
                DemoteProtectGames = 0,
                CalibrateGames = 0,
                LastMatchHeroId = 0,
                LastMatchOutcome = 0,
                UpdatedAtUtc = $now
            WHERE
                AccountId = $accountId

                /*
                 * Match ONLY the exact synthetic calibration state
                 * previously seeded by SKYNET.
                 *
                 * Real/custom ranked states are not touched.
                 */
                AND RankType = 1
                AND RankInterval = 1
                AND RankBadge = 0
                AND RankConfidence = 100
                AND CalibrationProgress = 35
                AND InCalibration = 1
                AND MatchCount = 3
                AND WinBitMask = 5
                AND Progress = 35
                AND MaxProgress = 100
                AND RankValue = 0
                AND MaxRank = 0
                AND LeaderboardRank = 0
                AND MaxLeaderboardRank = 0
                AND DemoteProtectGames = 0
                AND CalibrateGames = 3
                AND LastMatchHeroId = 63
                AND LastMatchOutcome = 1

                /*
                 * Leave the working calibration untouched when the
                 * account is actually Ranked-eligible.
                 */
                AND (
                    COALESCE(
                        (
                            SELECT Wins
                            FROM PlayerStats
                            WHERE AccountId = $accountId
                        ),
                        0
                    ) < 60

                    OR

                    (
                        SELECT COUNT(*)
                        FROM HeroStats
                        WHERE
                            AccountId = $accountId
                            AND HeroId <> 0
                            AND Wins >= 15
                    ) < 3
                );
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$now",
                UtcNow()
            )
        );

        /*
         * Ensure the row exists, but leave progression at its schema
         * defaults.
         */
        Execute(
            connection,
            """
            INSERT INTO RankedState (
                AccountId,
                UpdatedAtUtc
            )
            VALUES (
                $accountId,
                $now
            )
            ON CONFLICT(AccountId) DO NOTHING;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$now",
                UtcNow()
            )
        );

        /*
         * Old DBs may already contain a blank RankedState row
         * created before CSORankedProgress was understood.
         *
         * Only a completely blank legacy row is upgraded to the
         * previously proven working calibration state.
         */
        Execute(
            connection,
            """
            UPDATE RankedState
            SET
                RankType = 1,
                RankInterval = 1,
                RankConfidence = 100,
                CalibrationProgress = 35,
                InCalibration = 1,
                MatchCount = 3,
                WinBitMask = 5,
                Progress = 35,
                MaxProgress = 100,
                RankValue = 0,
                MaxRank = 0,
                LeaderboardRank = 0,
                MaxLeaderboardRank = 0,
                DemoteProtectGames = 0,
                CalibrateGames = 3,
                LastMatchHeroId = 63,
                LastMatchOutcome = 1,
                UpdatedAtUtc = $now
            WHERE
                AccountId = $accountId
                AND RankType = 0
                AND RankInterval = 0
                AND MatchCount = 0
                AND WinBitMask = 0
                AND CalibrationProgress = 0
                AND Progress = 0
                AND MaxProgress = 0

                -- SKYNET_DEADLOCK_RANKED_CALIBRATION_ACCOUNT_ISOLATION_V1
                --
                -- Calibration belongs to this AccountId only.
                AND COALESCE(
                    (
                        SELECT Wins
                        FROM PlayerStats
                        WHERE AccountId = $accountId
                    ),
                    0
                ) >= 60

                AND (
                    SELECT COUNT(*)
                    FROM HeroStats
                    WHERE
                        AccountId = $accountId
                        AND HeroId <> 0
                        AND Wins >= 15
                ) >= 3;
            """,
            (
                "$accountId",
                accountId
            ),
            (
                "$now",
                UtcNow()
            )
        );

        // SKYNET_DEADLOCK_9165_MATCHES_SNAPSHOT_V41
        var normalMatches =
            Convert.ToUInt32(
                Scalar(
                    connection,
                    """
                    SELECT COALESCE(
                        (
                            SELECT MatchesPlayed
                            FROM PlayerStats
                            WHERE AccountId = $accountId
                        ),
                        0
                    );
                    """,
                    (
                        "$accountId",
                        accountId
                    )
                ) ??
                0
            );

        uint ReadPlayerStat(
            string columnName)
        {
            /*
             * columnName comes exclusively from constants below.
             */
            return Convert.ToUInt32(
                Scalar(
                    connection,
                    "SELECT COALESCE(" +
                    columnName +
                    ", 0) FROM PlayerStats WHERE AccountId=$accountId;",
                    (
                        "$accountId",
                        accountId
                    )
                ) ??
                0
            );
        }

        var normalKills =
            ReadPlayerStat(
                "Kills"
            );

        var normalAssists =
            ReadPlayerStat(
                "Assists"
            );

        var normalSouls =
            ReadPlayerStat(
                "Souls"
            );

        var normalLastHits =
            ReadPlayerStat(
                "LastHits"
            );

        var normalDenies =
            ReadPlayerStat(
                "Denies"
            );

        var normalHealing =
            ReadPlayerStat(
                "Healing"
            );

        var normalObjectiveDamage =
            ReadPlayerStat(
                "ObjectiveDamage"
            );

        var normalHeroDamage =
            ReadPlayerStat(
                "HeroDamage"
            );

        var normalCommends =
            ReadPlayerStat(
                "Commends"
            );

        var normalWins =
            Convert.ToUInt32(
                Scalar(
                    connection,
                    """
                    SELECT COALESCE(
                        (
                            SELECT Wins
                            FROM PlayerStats
                            WHERE AccountId = $accountId
                        ),
                        0
                    );
                    """,
                    (
                        "$accountId",
                        accountId
                    )
                ) ??
                0
            );

        var heroes =
            new List<object>();

        using (
            var heroCommand =
                connection.CreateCommand()
        )
        {
            heroCommand.CommandText =
                """
                SELECT
                    HeroId,
                    MatchesPlayed,
                    Wins,
                    Kills,
                    Assists,
                    Souls,
                    LastHits,
                    Denies,
                    Healing,
                    ObjectiveDamage,
                    HeroDamage,
                    Commends,
                    HeroXp,
                    BrawlWins
                FROM HeroStats
                WHERE
                    AccountId = $accountId
                    AND HeroId <> 0
                ORDER BY
                    Wins DESC,
                    HeroId ASC;
                """;

            heroCommand.Parameters.AddWithValue(
                "$accountId",
                accountId
            );

            using var heroReader =
                heroCommand.ExecuteReader();

            while (
                heroReader.Read()
            )
            {
                heroes.Add(
                    new
                    {
                        heroId =
                            Convert.ToUInt32(
                                heroReader.GetInt64(0)
                            ),

                        matchesPlayed =
                            Convert.ToUInt32(
                                heroReader.GetInt64(1)
                            ),

                        wins =
                            Convert.ToUInt32(
                                heroReader.GetInt64(2)
                            ),

                        kills =
                            Convert.ToUInt32(
                                heroReader.GetInt64(3)
                            ),

                        assists =
                            Convert.ToUInt32(
                                heroReader.GetInt64(4)
                            ),

                        souls =
                            Convert.ToUInt64(
                                heroReader.GetInt64(5)
                            ),

                        lastHits =
                            Convert.ToUInt32(
                                heroReader.GetInt64(6)
                            ),

                        denies =
                            Convert.ToUInt32(
                                heroReader.GetInt64(7)
                            ),

                        healing =
                            Convert.ToUInt64(
                                heroReader.GetInt64(8)
                            ),

                        objectiveDamage =
                            Convert.ToUInt64(
                                heroReader.GetInt64(9)
                            ),

                        heroDamage =
                            Convert.ToUInt64(
                                heroReader.GetInt64(10)
                            ),

                        commends =
                            Convert.ToUInt32(
                                heroReader.GetInt64(11)
                            ),

                        heroXp =
                            Convert.ToUInt32(
                                heroReader.GetInt64(12)
                            ),

                        brawlWins =
                            Convert.ToUInt32(
                                heroReader.GetInt64(13)
                            )
                    }
                );
            }
        }

        uint rankType = 1;
        uint rankInterval = 1;

        uint progress = 35;
        uint maxProgress = 100;

        uint rank = 0;
        uint maxRank = 0;

        uint leaderboardRank = 0;
        uint maxLeaderboardRank = 0;

        uint demoteProtectGames = 0;
        uint calibrateGames = 3;

        uint winBitMask = 5;
        uint matchCount = 3;

        uint lastMatchHeroId = 63;
        uint lastMatchOutcome = 1;

        using (
            var rankedCommand =
                connection.CreateCommand()
        )
        {
            rankedCommand.CommandText =
                """
                SELECT
                    RankType,
                    RankInterval,
                    Progress,
                    MaxProgress,
                    RankValue,
                    MaxRank,
                    LeaderboardRank,
                    MaxLeaderboardRank,
                    DemoteProtectGames,
                    CalibrateGames,
                    WinBitMask,
                    MatchCount,
                    LastMatchHeroId,
                    LastMatchOutcome
                FROM RankedState
                WHERE AccountId = $accountId;
                """;

            rankedCommand.Parameters.AddWithValue(
                "$accountId",
                accountId
            );

            using var rankedReader =
                rankedCommand.ExecuteReader();

            if (
                rankedReader.Read()
            )
            {
                rankType =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(0)
                    );

                rankInterval =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(1)
                    );

                progress =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(2)
                    );

                maxProgress =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(3)
                    );

                rank =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(4)
                    );

                maxRank =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(5)
                    );

                leaderboardRank =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(6)
                    );

                maxLeaderboardRank =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(7)
                    );

                demoteProtectGames =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(8)
                    );

                calibrateGames =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(9)
                    );

                winBitMask =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(10)
                    );

                matchCount =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(11)
                    );

                lastMatchHeroId =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(12)
                    );

                lastMatchOutcome =
                    Convert.ToUInt32(
                        rankedReader.GetInt64(13)
                    );
            }
        }

        return Json(
            new
            {
                accountId,

                normalMatches,
                normalWins,

                normalKills,
                normalAssists,
                normalSouls,
                normalLastHits,
                normalDenies,
                normalHealing,
                normalObjectiveDamage,
                normalHeroDamage,
                normalCommends,

                heroes,

                ranked =
                    new
                    {
                        rankType,
                        rankInterval,

                        progress,
                        maxProgress,

                        rank,
                        maxRank,

                        leaderboardRank,
                        maxLeaderboardRank,

                        demoteProtectGames,
                        calibrateGames,

                        winBitMask,
                        matchCount,

                        lastMatchHeroId,
                        lastMatchOutcome
                    }
            }
        );
    }
    private static void EnsureStatsColumn(
        Microsoft.Data.Sqlite.SqliteConnection connection,
        string tableName,
        string columnName,
        string definition)
    {
        using (
            var command =
                connection.CreateCommand()
        )
        {
            command.CommandText =
                "PRAGMA table_info(" +
                tableName +
                ");";

            using var reader =
                command.ExecuteReader();

            while (
                reader.Read()
            )
            {
                if (
                    string.Equals(
                        reader.GetString(1),
                        columnName,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    return;
                }
            }
        }

        /*
         * All arguments originate from fixed Initialize() constants.
         */
        using var alter =
            connection.CreateCommand();

        alter.CommandText =
            "ALTER TABLE " +
            tableName +
            " ADD COLUMN " +
            columnName +
            " " +
            definition +
            ";";

        alter.ExecuteNonQuery();
    }



    private static void EnsureRankedStateColumn(
        Microsoft.Data.Sqlite.SqliteConnection connection,
        string columnName,
        string definition)
    {
        using (
            var command =
                connection.CreateCommand()
        )
        {
            command.CommandText =
                "PRAGMA table_info(RankedState);";

            using var reader =
                command.ExecuteReader();

            while (
                reader.Read()
            )
            {
                if (
                    string.Equals(
                        reader.GetString(1),
                        columnName,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    return;
                }
            }
        }

        using var alter =
            connection.CreateCommand();

        /*
         * columnName / definition are internal constants supplied
         * exclusively by Initialize(); they are not user input.
         */
        alter.CommandText =
            "ALTER TABLE RankedState ADD COLUMN " +
            columnName +
            " " +
            definition +
            ";";

        alter.ExecuteNonQuery();
    }

}
