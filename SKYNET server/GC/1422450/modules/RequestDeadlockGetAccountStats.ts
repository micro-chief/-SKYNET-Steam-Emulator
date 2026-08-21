import {
    Route
} from "../framework/gc";

// SKYNET_OFFICIAL_RANKED_READY_9165_V1

export const RequestDeadlockGetAccountStatsRoute: Route = {
    requestId:
        9164,

    request: {
        name:
            "CMsgClientToGCGetAccountStats"
    },

    responseId:
        9165,

    response: {
        name:
            "CMsgClientToGCGetAccountStatsResponse"
    }
};

const OFFICIAL_STATS: any[] = [
    {
        hero_id: 0,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        total_value: [3544n, 7485n, 18612957n, 61814n, 1881n, 335n, 664n, 2100930n, 71n, 23n, 35n, 360n, 101n, 51n, 4596853n, 25314050n, 1588n],
        medals_bronze: [205, 298, 161, 140, 1, 0, 0, 38, 0, 0, 0, 0, 0, 0, 107, 3, 0],
        medals_silver: [95, 80, 331, 242, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 244, 162, 0],
        medals_gold: [11, 1, 118, 46, 0, 0, 0, 0, 71, 23, 35, 360, 101, 51, 157, 496, 0]
    },
    {
        hero_id: 1,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 14, 15, 16, 17],
        total_value: [39n, 77n, 176035n, 784n, 24n, 4n, 7n, 32285n, 1n, 2n, 1n, 31406n, 223977n, 22n],
        medals_bronze: [4, 2, 1, 3, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0],
        medals_silver: [1, 1, 5, 3, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 5, 0]
    },
    {
        hero_id: 2,
        stat_id: [1, 2, 3, 4, 5, 7, 8, 12, 15, 16, 17],
        total_value: [7n, 14n, 64769n, 251n, 3n, 3n, 5164n, 1n, 11236n, 83676n, 4n],
        medals_bronze: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 2, 2, 0, 0, 0, 0, 1, 1, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0]
    },
    {
        hero_id: 3,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17],
        total_value: [3n, 13n, 21141n, 118n, 5n, 1n, 1n, 5625n, 623n, 46369n, 4n],
        medals_bronze: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
    },
    {
        hero_id: 4,
        stat_id: [1, 2, 3, 4, 5, 7, 8, 11, 12, 14, 15, 16, 17],
        total_value: [2n, 14n, 60091n, 169n, 17n, 2n, 4580n, 1n, 1n, 1n, 34057n, 53407n, 3n],
        medals_bronze: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 0]
    },
    {
        hero_id: 7,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 16, 17],
        total_value: [22n, 42n, 88933n, 653n, 32n, 2n, 3n, 37969n, 1n, 25307n, 144278n, 11n],
        medals_bronze: [1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        medals_gold: [0, 0, 1, 3, 0, 0, 0, 0, 1, 1, 3, 0]
    },
    {
        hero_id: 8,
        stat_id: [1, 2, 3, 4, 5, 7, 8, 15, 16],
        total_value: [1n, 13n, 34599n, 155n, 10n, 1n, 5704n, 5376n, 38373n],
        medals_bronze: [0, 1, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 1, 1, 0, 0, 0, 1, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 1]
    },
    {
        hero_id: 11,
        stat_id: [1, 2, 3, 4, 6, 7, 8, 12, 15, 16, 17],
        total_value: [4n, 14n, 30009n, 64n, 1n, 1n, 5567n, 1n, 45378n, 48000n, 2n],
        medals_bronze: [0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0]
    },
    {
        hero_id: 14,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17],
        total_value: [360n, 925n, 1885821n, 10913n, 484n, 32n, 70n, 398853n, 1n, 4n, 2n, 7n, 1n, 338989n, 2741833n, 181n],
        medals_bronze: [31, 32, 15, 8, 0, 0, 0, 13, 0, 0, 0, 0, 0, 12, 0, 0],
        medals_silver: [7, 14, 49, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21, 13, 0],
        medals_gold: [0, 0, 6, 12, 0, 0, 0, 0, 1, 4, 2, 7, 1, 10, 57, 0]
    },
    {
        hero_id: 16,
        stat_id: [1, 3, 4, 7, 12, 15, 16, 17],
        total_value: [1n, 5869n, 4n, 1n, 1n, 1731n, 22400n, 4n],
        medals_bronze: [0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 0, 0, 0, 0, 1, 0],
        medals_gold: [0, 0, 0, 0, 1, 0, 0, 0]
    },
    {
        hero_id: 18,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17],
        total_value: [47n, 100n, 228978n, 1353n, 39n, 5n, 9n, 20982n, 111667n, 354778n, 28n],
        medals_bronze: [3, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [1, 1, 8, 7, 0, 0, 0, 0, 2, 1, 0],
        medals_gold: [0, 0, 0, 1, 0, 0, 0, 0, 7, 8, 0]
    },
    {
        hero_id: 19,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        total_value: [210n, 336n, 766753n, 2973n, 146n, 13n, 25n, 161247n, 4n, 2n, 1n, 2n, 2n, 1n, 331328n, 914125n, 66n],
        medals_bronze: [8, 13, 6, 7, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [10, 5, 14, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 6, 0],
        medals_gold: [0, 0, 5, 3, 0, 0, 0, 0, 4, 2, 1, 2, 2, 1, 16, 19, 0]
    },
    {
        hero_id: 25,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17],
        total_value: [169n, 367n, 858996n, 4062n, 119n, 14n, 24n, 232856n, 3n, 3n, 3n, 2n, 2n, 138894n, 1014945n, 60n],
        medals_bronze: [10, 14, 3, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0],
        medals_silver: [5, 6, 14, 15, 0, 0, 0, 2, 0, 0, 0, 0, 0, 10, 1, 0],
        medals_gold: [1, 0, 7, 8, 0, 0, 0, 0, 3, 3, 3, 2, 2, 4, 23, 0]
    },
    {
        hero_id: 35,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        total_value: [733n, 2429n, 5814895n, 12323n, 55n, 127n, 261n, 270795n, 20n, 1n, 22n, 255n, 63n, 17n, 1745367n, 9411414n, 484n],
        medals_bronze: [52, 108, 90, 66, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 49, 0, 0],
        medals_silver: [2, 13, 110, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 98, 83, 0],
        medals_gold: [0, 0, 24, 0, 0, 0, 0, 0, 20, 1, 22, 255, 63, 17, 53, 178, 0]
    },
    {
        hero_id: 50,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17],
        total_value: [174n, 358n, 997163n, 3614n, 87n, 14n, 32n, 121922n, 2n, 1n, 6n, 1n, 1n, 129221n, 1185955n, 109n],
        medals_bronze: [13, 15, 4, 10, 0, 0, 0, 1, 0, 0, 0, 0, 0, 9, 0, 0],
        medals_silver: [5, 3, 18, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 10, 0],
        medals_gold: [0, 0, 8, 3, 0, 0, 0, 0, 2, 1, 6, 1, 1, 0, 22, 0]
    },
    {
        hero_id: 58,
        stat_id: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 15, 16, 17],
        total_value: [39n, 85n, 280215n, 488n, 8n, 16n, 32092n, 1n, 1n, 16n, 36601n, 518800n, 27n],
        medals_bronze: [3, 2, 9, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0],
        medals_silver: [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 7, 0],
        medals_gold: [0, 0, 1, 0, 0, 0, 0, 1, 1, 16, 1, 9, 0]
    },
    {
        hero_id: 63,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17],
        total_value: [306n, 402n, 1300769n, 5150n, 198n, 21n, 35n, 190134n, 4n, 1n, 4n, 2n, 3n, 85737n, 1537485n, 94n],
        medals_bronze: [17, 21, 2, 7, 0, 0, 0, 5, 0, 0, 0, 0, 0, 10, 1, 0],
        medals_silver: [14, 4, 20, 21, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 3, 0],
        medals_gold: [1, 0, 12, 7, 0, 0, 0, 0, 4, 1, 4, 2, 3, 0, 31, 0]
    },
    {
        hero_id: 64,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        total_value: [1291n, 1952n, 5211967n, 15798n, 573n, 81n, 142n, 496326n, 34n, 7n, 7n, 54n, 17n, 23n, 1295504n, 5846320n, 392n],
        medals_bronze: [52, 68, 19, 29, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 12, 1, 0],
        medals_silver: [47, 30, 69, 75, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 56, 25, 0],
        medals_gold: [9, 1, 50, 8, 0, 0, 0, 0, 34, 7, 7, 54, 17, 23, 55, 114, 0]
    },
    {
        hero_id: 65,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 17],
        total_value: [37n, 94n, 282250n, 996n, 43n, 2n, 8n, 32585n, 1n, 1n, 2n, 31428n, 273078n, 22n],
        medals_bronze: [3, 6, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
        medals_silver: [0, 0, 4, 5, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0],
        medals_gold: [0, 0, 3, 1, 0, 0, 0, 0, 1, 1, 2, 0, 4, 0]
    },
    {
        hero_id: 67,
        stat_id: [1, 2, 3, 4, 6, 7, 8, 15, 16, 17],
        total_value: [3n, 19n, 25979n, 190n, 1n, 1n, 5688n, 7816n, 48957n, 4n],
        medals_bronze: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 1, 1, 0, 0, 0, 1, 0, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
    },
    {
        hero_id: 69,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 13, 15, 16, 17],
        total_value: [5n, 28n, 23215n, 148n, 3n, 1n, 1n, 1368n, 1n, 469n, 44750n, 6n],
        medals_bronze: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0]
    },
    {
        hero_id: 72,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 13, 15, 16, 17],
        total_value: [46n, 91n, 175303n, 697n, 24n, 3n, 6n, 23384n, 1n, 66448n, 229605n, 35n],
        medals_bronze: [2, 2, 3, 2, 0, 0, 0, 0, 0, 0, 1, 0],
        medals_silver: [2, 2, 2, 4, 0, 0, 0, 0, 0, 4, 1, 0],
        medals_gold: [0, 0, 1, 0, 0, 0, 0, 0, 1, 2, 4, 0]
    },
    {
        hero_id: 76,
        stat_id: [1, 2, 3, 4, 5, 7, 8, 15, 16, 17],
        total_value: [6n, 9n, 31084n, 91n, 5n, 1n, 3183n, 11184n, 26945n, 1n],
        medals_bronze: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0]
    },
    {
        hero_id: 77,
        stat_id: [1, 2, 3, 4, 6, 7, 8, 12, 15, 16, 17],
        total_value: [4n, 10n, 23095n, 34n, 1n, 1n, 1721n, 1n, 5026n, 34000n, 1n],
        medals_bronze: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        medals_silver: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0]
    },
    {
        hero_id: 79,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 15, 16, 17],
        total_value: [10n, 60n, 113975n, 495n, 8n, 2n, 8n, 6173n, 2n, 7n, 3n, 72835n, 302050n, 15n],
        medals_bronze: [0, 1, 4, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        medals_silver: [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 4, 2, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 2, 7, 3, 3, 6, 0]
    },
    {
        hero_id: 80,
        stat_id: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17],
        total_value: [25n, 33n, 111053n, 291n, 6n, 2n, 5n, 4727n, 1n, 2n, 4n, 1n, 33225n, 168530n, 13n],
        medals_bronze: [3, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        medals_silver: [0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0],
        medals_gold: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 1, 1, 4, 0]
    },
];

export const requestDeadlockGetAccountStats =
(ctx: any): void => {

    // SKYNET_DEADLOCK_9165_DB_SINGLE_SOURCE_V3
    //
    // Canonical progression source:
    //
    // deadlock.db
    //
    // PlayerStats.Wins
    //      -> SO104 CSOGameAccountClient.wins
    //      -> 9165 hero_id=0 / stat_id=6
    //
    // HeroStats.Wins
    //      -> SO107 CSOAccountHeroInfo.wins
    //      -> 9165 hero rows / stat_id=6
    //
    // HeroStats.MatchesPlayed
    //      -> 9165 hero rows / stat_id=7

    const request: any =
        ctx.request;

    const accountId =
        request.account_id ??
        ctx.accountId;

    log(
        "[9164-DB] account_id=" +
        accountId
    );

    // SKYNET_9165_DIRECT_DB_MATCHES_PROBE_V2
    //
    // Direct canonical readers from DeadlockDB.
    // Diagnostics only.
    const directAccount: any =
        deadlockAccountStats(
            accountId
        );

    const directHeroes: any =
        deadlockHeroStats(
            accountId
        );

    log(
        "[9165-DIRECT] account_id=" +
        accountId
    );

    if (
        directAccount != undefined &&
        directAccount != null
    ) {
        log(
            "[9165-DIRECT] global wins=" +
            (
                directAccount.wins ??
                0
            )
        );

        log(
            "[9165-DIRECT] global matches=" +
            (
                directAccount.matchesPlayed ??
                0
            )
        );

        log(
            "[9165-DIRECT] global losses=" +
            (
                directAccount.losses ??
                0
            )
        );
    } else {
        log(
            "[9165-DIRECT] account stats missing"
        );
    }

    if (
        directHeroes != undefined &&
        directHeroes != null
    ) {
        for (
            let directIndex = 0;
            directIndex < directHeroes.length;
            directIndex++
        ) {
            const directHero: any =
                directHeroes[
                    directIndex
                ];

            log(
                "[9165-DIRECT] hero=" +
                (
                    directHero.heroId ??
                    0
                ) +
                " wins=" +
                (
                    directHero.wins ??
                    0
                ) +
                " matches=" +
                (
                    directHero.matchesPlayed ??
                    0
                ) +
                " losses=" +
                (
                    directHero.losses ??
                    0
                )
            );
        }
    } else {
        log(
            "[9165-DIRECT] hero stats missing"
        );
    }


    const db: any =
        deadlockRankedSocache(
            accountId
        );

    if (
        db == undefined
    ) {
        log(
            "[9165-DB] snapshot missing"
        );

        ctx.reply({
            result:
                0
        });

        return true;
    }

    const heroes: any[] =
        db.heroes ?? [];

    const rows: any[] =
        [];

    let heroMatchesTotal =
        0;

    for (
        let i = 0;
        i < heroes.length;
        i++
    ) {
        const hero: any =
            heroes[i];

        const heroId =
            hero.heroId ?? 0;

        if (
            heroId === 0
        ) {
            continue;
        }

        const heroWins =
            hero.wins ?? 0;

        const heroMatches =
            hero.matchesPlayed ?? 0;

        heroMatchesTotal =
            heroMatchesTotal +
            heroMatches;

        // SKYNET_DEADLOCK_FULL_PROFILE_STATS_9165_V1
        rows.push({
            hero_id:
                heroId,

            stat_id: [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                15,
                16,
                17
            ],

            total_value: [
                hero.kills ?? 0,
                hero.assists ?? 0,
                hero.souls ?? 0,
                hero.lastHits ?? 0,
                hero.denies ?? 0,
                hero.wins ?? 0,
                hero.matchesPlayed ?? 0,
                hero.healing ?? 0,
                hero.objectiveDamage ?? 0,
                hero.heroDamage ?? 0,
                hero.commends ?? 0
            ],

            medals_bronze: [
                0,0,0,0,0,0,0,0,0,0,0
            ],

            medals_silver: [
                0,0,0,0,0,0,0,0,0,0,0
            ],

            medals_gold: [
                0,0,0,0,0,0,0,0,0,0,0
            ]
        });

        log(
            "[9165-DB] hero=" +
            heroId +
            " wins=" +
            heroWins +
            " matches=" +
            heroMatches
        );
    }

    /*
     * hero_id=0 is correct HERE.
     *
     * This is the GLOBAL CMsgAccountHeroStats row,
     * not the removed SO107 hero_id=0 experiment.
     */

    const accountWins =
        db.normalWins ?? 0;

    const accountMatches =
        db.normalMatches ?? 0;

    rows.unshift({
        hero_id:
            0,

        stat_id: [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            15,
            16,
            17
        ],

        total_value: [
            db.normalKills ?? 0,
            db.normalAssists ?? 0,
            db.normalSouls ?? 0,
            db.normalLastHits ?? 0,
            db.normalDenies ?? 0,
            accountWins,
            accountMatches,
            db.normalHealing ?? 0,
            db.normalObjectiveDamage ?? 0,
            db.normalHeroDamage ?? 0,
            db.normalCommends ?? 0
        ],

        medals_bronze: [
            0,0,0,0,0,0,0,0,0,0,0
        ],

        medals_silver: [
            0,0,0,0,0,0,0,0,0,0,0
        ],

        medals_gold: [
            0,0,0,0,0,0,0,0,0,0,0
        ]
    });

    log(
        "[9165-DB] global wins=" +
        accountWins
    );

    log(
        "[9165-DB] global matches=" +
        accountMatches
    );

    log(
        "[9165-DB] hero rows=" +
        heroes.length
    );

    log(
        "[9165-DB] source=deadlock.db"
    );

    log(
        "[9165-DB] SAME SOURCE AS SO104/SO107"
    );

    /*
     * k_eSuccess = 1
     */

    ctx.reply({
        result:
            1,

        stats: {
            account_id:
                accountId,

            stats:
                rows
        }
    });

    return true;
};

export default requestDeadlockGetAccountStats;
