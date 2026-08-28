// tools/add-route.ts
// Deadlock 1422450 - POSTMATCH V1.7 TYPE107 CRASH GUARD
//
// bot_difficulty == 0 -> ordinary match, no bot preset
// bot_difficulty 1..5 -> Valve 6v6 bot preset after +map
//
// Run:
//   node --experimental-strip-types tools/add-route.ts

import fs from "node:fs";

const REPO_ROOT =
    "D:\\Visual Studio Test repos\\-SKYNET-Steam-Emulator-master";

const SERVER_ROOT =
    REPO_ROOT + "\\SKYNET server";

const TOOLS_ROOT =
    SERVER_ROOT + "\\GC\\tools";

const FILES = {
    partyStart:
        SERVER_ROOT + "\\GC\\1422450\\modules\\RequestDeadlockPartyStartMatch.ts",
    allocate:
        SERVER_ROOT + "\\GC\\1422450\\modules\\RequestDeadlockAllocateForMatchResponseRaw.ts",
    signout:
        SERVER_ROOT + "\\GC\\1422450\\modules\\RequestDeadlockMatchSignoutRaw.ts",
    host:
        SERVER_ROOT + "\\Services\\GameCoordinator\\GameCoordinatorScriptPlugin.cs",
    runtime:
        SERVER_ROOT + "\\Services\\GameCoordinator\\DeadlockGcRuntimeServices.cs",
    program:
        SERVER_ROOT + "\\Program.cs",
    supervisor:
        SERVER_ROOT + "\\Services\\DeadlockDedicatedServerSupervisor.cs",
    gameCfg:
        "C:\\games\\Deadlock\\game\\citadel\\cfg\\citadel_server.cfg",
    botServerCfg:
        "C:\\games\\Deadlock\\game\\citadel\\cfg\\skynet_botmatch_server.cfg",
    stateDoc:
        REPO_ROOT + "\\DEADLOCK_GC_STATE.md"
};

const MARKERS = {
    partyStart:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_PARTY",
    host:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_HOST",
    runtime:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_RUNTIME",
    program:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_WIRE",
    supervisor:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_SUPERVISOR",
    gameCfg:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_GAMECFG",
    stateDoc:
        "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_STATE"
};

const TYPESHARP_FIX_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V11_TYPESHARP";

const LATE_SERVER_CFG_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V12_SERVERCFG";

const LATE_SERVER_CFG_STATE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V12_STATE";

const SERVER_BOT_ROSTER_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_SERVER_ROSTER";

const SERVER_BOT_ROSTER_STATE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_STATE";

const HERO_RESTORE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_ROLLBACK_HERO_V1";

const HERO_RESTORE_STATE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_ROLLBACK_HERO_STATE_V1";

const STATIC_BOT_MEMBERS_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V14_STATIC_BOT_MEMBERS";

const STATIC_BOT_MEMBERS_STATE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V14_STATE";

const VALIDATED_BOT_HERO_POOL_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V15_VALIDATED_HERO_POOL";

const VALIDATED_BOT_HERO_POOL_STATE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V15_STATE";

const HUMAN_SIGNOUT_SLOT_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V16_HUMAN_SIGNOUT_SLOT";

const HUMAN_SIGNOUT_SLOT_STATE_MARKER =
    "SKYNET_DEADLOCK_CONDITIONAL_BOTS_V16_STATE";

const POSTMATCH_TYPE107_CRASH_GUARD_MARKER =
    "SKYNET_DEADLOCK_POSTMATCH_TYPE107_CRASH_GUARD_V17";

const POSTMATCH_TYPE107_CRASH_GUARD_STATE_MARKER =
    "SKYNET_DEADLOCK_POSTMATCH_TYPE107_CRASH_GUARD_V17_STATE";

const BOT_SERVER_CFG =
    `// ${LATE_SERVER_CFG_MARKER}
// Executed by Source 2 after ResetGameConVarsToDefaults.
exec citadel_server.cfg
exec citadel_botmatch_practice_6v6.cfg
`;

function fail(message: string): never {
    throw new Error(message);
}

function read(file: string): string {
    if (!fs.existsSync(file)) {
        fail("[missing] " + file);
    }

    return fs.readFileSync(file, "utf8");
}

function normalize(source: string): string {
    return source.replace(/\r\n/g, "\n");
}

function eolOf(source: string): string {
    return source.includes("\r\n")
        ? "\r\n"
        : "\n";
}

function withEol(source: string, eol: string): string {
    return normalize(source).replace(/\n/g, eol);
}

function requireText(
    source: string,
    needle: string,
    label: string
): void {
    if (!source.includes(needle)) {
        fail("[baseline] " + label + " missing");
    }
}

function forbidText(
    source: string,
    needle: string,
    label: string
): void {
    if (source.includes(needle)) {
        fail("[baseline] " + label + " unexpectedly present");
    }
}

function replaceOnce(
    source: string,
    before: string,
    after: string,
    label: string
): string {
    const first =
        source.indexOf(before);

    if (first < 0) {
        fail("[baseline] " + label + " not found");
    }

    if (
        source.indexOf(
            before,
            first + before.length
        ) >=
        0
    ) {
        fail("[baseline] " + label + " ambiguous");
    }

    return source.slice(0, first) +
        after +
        source.slice(first + before.length);
}

function installed(): boolean {
    return Object.entries(MARKERS).every(([key, marker]) => {
        const file =
            FILES[key as keyof typeof FILES];

        return fs.existsSync(file) &&
            read(file).includes(marker);
    });
}

function verify(): boolean {
    if (!installed()) {
        return false;
    }

    const partyStart = normalize(read(FILES.partyStart));
    const allocate = normalize(read(FILES.allocate));
    const signout = normalize(read(FILES.signout));
    const host = normalize(read(FILES.host));
    const runtime = normalize(read(FILES.runtime));
    const program = normalize(read(FILES.program));
    const supervisor = normalize(read(FILES.supervisor));
    const gameCfg = normalize(read(FILES.gameCfg));
    const botServerCfg = normalize(read(FILES.botServerCfg));
    const stateDoc = normalize(read(FILES.stateDoc));

    requireText(
        partyStart,
        `deadlockStartDedicatedServer(
            matchLobbyId,
            "",
            botDifficulty`,
        "party forwards bot difficulty"
    );

    requireText(
        partyStart,
        TYPESHARP_FIX_MARKER,
        "TypeSharp-safe bot log"
    );

    forbidText(
        partyStart,
        `" bots=" +
        botMatch`,
        "boolean string concatenation"
    );

    requireText(
        allocate,
        HERO_RESTORE_MARKER,
        "unconditional GC hero roster restore"
    );

    forbidText(
        allocate,
        SERVER_BOT_ROSTER_MARKER,
        "disproved server-managed bot roster"
    );

    requireText(
        allocate,
        `    sky102UInt(
        staticLobby,
        8,
        1
    );`,
        "unconditional GC-provided hero policy"
    );

    requireText(
        allocate,
        `    log(
        "[102-GS] gc_provided_heroes=true"
    );`,
        "restored GC hero policy log"
    );

    forbidText(
        allocate,
        "gc_provided_heroes=false",
        "regressed GC hero policy log"
    );

    requireText(
        allocate,
        STATIC_BOT_MEMBERS_MARKER,
        "static bot members"
    );

    requireText(
        allocate,
        VALIDATED_BOT_HERO_POOL_MARKER,
        "live-build bot hero pool"
    );

    requireText(
        allocate,
        HUMAN_SIGNOUT_SLOT_MARKER,
        "single-human bot-match signout slot"
    );

    requireText(
        signout,
        POSTMATCH_TYPE107_CRASH_GUARD_MARKER,
        "postmatch type107 client crash guard"
    );

    forbidText(
        signout,
        `        deadlockQueueCurrentPostMatchAnalytics();`,
        "crashing synthetic type107/9166 call"
    );

    requireText(
        allocate,
        `                partyMembers.length ===
                    1 &&
                playerSlot ===
                    0`,
        "slot workaround scope"
    );

    requireText(
        allocate,
        `                playerSlot =
                    2;`,
        "slot zero to two workaround"
    );

    requireText(
        allocate,
        `        7, 1, 27, 31, 2, 19,
        8, 14, 3, 11, 16, 18,`,
        "validated hero ordering"
    );

    forbidText(
        allocate,
        `        7, 1, 27, 31, 23, 22,
        2, 5, 28, 19, 8, 14,`,
        "V1.4 cross-build hero ordering"
    );

    requireText(
        allocate,
        `sky102UInt(
        output,
        16,
        botDifficulty
    );`,
        "per-member bot difficulty"
    );

    requireText(
        allocate,
        `playerSlot <
            12`,
        "12-slot bot roster"
    );

    requireText(
        host,
        `.Invoke(
                    lobbyId,
                    map,
                    botDifficulty`,
        "host forwards bot difficulty"
    );

    requireText(
        runtime,
        `ulong,
        string,
        uint,`,
        "runtime delegate"
    );

    requireText(
        program,
        "(lobbyId, map, botDifficulty) =>",
        "runtime wire"
    );

    requireText(
        supervisor,
        LATE_SERVER_CFG_MARKER,
        "late server cfg launch"
    );

    requireText(
        supervisor,
        "+servercfgfile",
        "servercfgfile argument"
    );

    forbidText(
        supervisor,
        `arguments.Add(
                    "+exec"
                );`,
        "early command-line exec"
    );

    requireText(
        gameCfg,
        MARKERS.gameCfg,
        "shared cfg guard"
    );

    forbidText(
        gameCfg,
        "exec citadel_botmatch_practice_6v6.cfg",
        "global bot exec"
    );

    requireText(
        botServerCfg,
        LATE_SERVER_CFG_MARKER,
        "bot server cfg marker"
    );

    requireText(
        botServerCfg,
        "exec citadel_server.cfg",
        "base server cfg chain"
    );

    requireText(
        botServerCfg,
        "exec citadel_botmatch_practice_6v6.cfg",
        "late Valve bot preset"
    );

    requireText(
        stateDoc,
        MARKERS.stateDoc,
        "state evidence"
    );

    requireText(
        stateDoc,
        LATE_SERVER_CFG_STATE_MARKER,
        "V1.2 state evidence"
    );

    requireText(
        stateDoc,
        HERO_RESTORE_STATE_MARKER,
        "V1.3 rollback state evidence"
    );

    requireText(
        stateDoc,
        STATIC_BOT_MEMBERS_STATE_MARKER,
        "V1.4 state evidence"
    );

    requireText(
        stateDoc,
        VALIDATED_BOT_HERO_POOL_STATE_MARKER,
        "V1.5 state evidence"
    );

    requireText(
        stateDoc,
        HUMAN_SIGNOUT_SLOT_STATE_MARKER,
        "V1.6 state evidence"
    );

    requireText(
        stateDoc,
        POSTMATCH_TYPE107_CRASH_GUARD_STATE_MARKER,
        "V1.7 state evidence"
    );

    // Protected working lifecycle.
    requireText(
        partyStart,
        "SKYNET_DEADLOCK_EPHEMERAL_MATCH_LOBBY_V1_START",
        "unique match ID"
    );

    requireText(
        host,
        "SKYNET_DEADLOCK_REAL_10014_DECODER_V2_HOST",
        "10014 decoder V2"
    );

    requireText(
        supervisor,
        "SKYNET_DEADLOCK_DEDICATED_STEAMID_GUARD_V1_METHOD",
        "dedicated guard"
    );

    console.log("[verify] POSTMATCH V1.7 TYPE107 CRASH GUARD already installed");
    console.log("[verify] bot_difficulty=0 -> no bot preset");
    console.log("[verify] bot_difficulty=1..5 -> late servercfgfile bot preset");
    console.log("[verify] bot match -> 12-slot static roster");
    console.log("[verify] one human at slot 0 -> signout-safe slot 2");
    console.log("[verify] synthetic postmatch type107/9166 -> disabled");
    console.log("[verify] all matches -> gc_provided_heroes=true");
    console.log("[verify] shared citadel_server.cfg has no global bot exec");
    return true;
}

function patchPostMatchType107CrashGuard(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `    // SKYNET_DEADLOCK_POSTMATCH_ANALYTICS_EPHEMERAL_V1_CALL
    // Official continuation after CacheUnsubscribed:
    //   26 type107, then 9166 with empty protobuf.
    const postMatchAnalyticsQueued =
        deadlockQueueCurrentPostMatchAnalytics();

    log(
        "[10014-GS] postmatch analytics queued=" +
        postMatchAnalyticsQueued
    );`,
        `    // ${POSTMATCH_TYPE107_CRASH_GUARD_MARKER}
    // Live client evidence: after the valid PostMatch type101 and cache
    // unsubscribe, the synthetic 26/type107 was the last GC message retrieved
    // before a C0000005 null-adjacent read in client.dll. The real server
    // signout already carries the bot table, human row, MVP and account stats.
    // Keep the unverified type107/9166 refresh disabled until an exact official
    // payload and cache context can be replayed.
    log(
        "[10014-GS] synthetic postmatch type107/9166 disabled"
    );`,
        "ephemeral postmatch analytics call"
    );

    return withEol(source, eol);
}

function patchPartyStart(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `    log(
        "[9131-DS] start request party_id=" +
        party.party_id +
        " match_lobby_id=" +
        matchLobbyId
    );

    const dedicatedLaunch: any =
        deadlockStartDedicatedServer(
            matchLobbyId
        );`,
        `    // ${MARKERS.partyStart}
    // The official captured bot match retained bot_difficulty=3.
    // Zero is the strict no-bot path.
    const requestedBotDifficulty =
        party.bot_difficulty ??
        0;

    const botDifficulty =
        requestedBotDifficulty >= 1 &&
        requestedBotDifficulty <= 5
            ? requestedBotDifficulty
            : 0;

    const botMatch =
        botDifficulty > 0;

    // ${TYPESHARP_FIX_MARKER}
    log(
        "[9131-DS] start request party_id=" +
        party.party_id +
        " match_lobby_id=" +
        matchLobbyId +
        " bot_difficulty=" +
        botDifficulty
    );

    if (botMatch) {
        log("[9131-DS] bots=true");
    }
    else {
        log("[9131-DS] bots=false");
    }

    const dedicatedLaunch: any =
        deadlockStartDedicatedServer(
            matchLobbyId,
            "",
            botDifficulty
        );`,
        "party dedicated call"
    );

    return withEol(source, eol);
}

function patchStaticBotMembers(source: string): string {
    source = replaceOnce(
        source,
        `function sky102EncodeMember(`,
        `// ${STATIC_BOT_MEMBERS_MARKER}
// The server protobuf defines Member.bot_difficulty as field 16. Valve's
// practice cfg only controls AI behavior; the static lobby owns participants
// early enough for BuildGameSessionManifest and fake-client creation.
function sky102ContainsNumber(
    values: number[],
    value: number
): boolean {
    let index =
        0;

    while (
        index <
        values.length
    ) {
        if (
            values[index] ===
            value
        ) {
            return true;
        }

        index++;
    }

    return false;
}

function sky102ChooseBotHero(
    usedHeroes: number[],
    sequence: number
): number {
    // ${VALIDATED_BOT_HERO_POOL_MARKER}
    // The first seven IDs were accepted by this dedicated build in the V1.4
    // live test. The remaining IDs come from this project's captured account
    // hero dataset; known cross-build failures 23/22/5/28 are excluded.
    const candidates = [
        7, 1, 27, 31, 2, 19,
        8, 14, 3, 11, 16, 18,
        25, 35, 50, 58, 63, 64,
        65, 67, 69, 72, 76, 77,
        79, 80
    ];

    let offset =
        0;

    while (
        offset <
        candidates.length
    ) {
        const index =
            (
                sequence +
                offset
            ) %
            candidates.length;

        const heroId =
            candidates[index];

        if (
            !sky102ContainsNumber(
                usedHeroes,
                heroId
            )
        ) {
            return heroId;
        }

        offset++;
    }

    return candidates[
        sequence %
        candidates.length
    ];
}

function sky102EncodeBotMember(
    playerSlot: number,
    heroId: number,
    botDifficulty: number,
    botIndex: number
): number[] {
    const output: number[] =
        [];

    sky102String(
        output,
        2,
        "Bot" +
        (
            botIndex +
            1
        )
    );

    sky102UInt(
        output,
        3,
        playerSlot <
            6
                ? 0
                : 1
    );

    sky102UInt(
        output,
        4,
        playerSlot
    );

    sky102UInt(
        output,
        5,
        heroId
    );

    sky102UInt(
        output,
        16,
        botDifficulty
    );

    log(
        "[102-GS] bot[" +
        botIndex +
        "] player_slot=" +
        playerSlot +
        " hero_id=" +
        heroId +
        " difficulty=" +
        botDifficulty
    );

    return output;
}

function sky102EncodeMember(`,
        "static bot member helpers"
    );

    source = replaceOnce(
        source,
        `    const partyMembers =
        party.members ??
        [];

    const encodedMembers: number[][] =
        [];

    let sourceIndex =
        0;

    while (
        sourceIndex <
        partyMembers.length
    ) {
        const member =
            partyMembers[
                sourceIndex
            ];

        const accountId =
            sky102Number(
                member.account_id ??
                member.accountId,
                0
            );

        if (
            accountId >
            0
        ) {
            encodedMembers.push(
                sky102EncodeMember(
                    member,
                    party,
                    encodedMembers.length
                )
            );
        }

        sourceIndex++;
    }

    if (
        encodedMembers.length ===
        0
    ) {
        log(
            "[102-GS] ABORT roster.count=0"
        );

        return 0;
    }`,
        `    const partyMembers =
        party.members ??
        [];

    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    const encodedMembers: number[][] =
        [];

    const occupiedSlots: number[] =
        [];

    const usedHeroes: number[] =
        [];

    let sourceIndex =
        0;

    while (
        sourceIndex <
        partyMembers.length
    ) {
        const member =
            partyMembers[
                sourceIndex
            ];

        const accountId =
            sky102Number(
                member.account_id ??
                member.accountId,
                0
            );

        if (
            accountId >
            0
        ) {
            const customSlot =
                sky102FindSlot(
                    party,
                    accountId
                );

            let playerSlot =
                sky102PlayerSlot(
                    customSlot,
                    encodedMembers.length
                );

            // ${HUMAN_SIGNOUT_SLOT_MARKER}
            // Live A/B evidence from this dedicated build:
            // - one human in slot 2 was emitted in match_data.players;
            // - the same human in slot 0 was omitted from match_data.players,
            //   although the server still calculated that player as MVP;
            // - bots are emitted normally in slot 0.
            // Keep the workaround limited to the proven single-human bot path.
            if (
                botDifficulty >
                    0 &&
                partyMembers.length ===
                    1 &&
                playerSlot ===
                    0
            ) {
                playerSlot =
                    2;

                log(
                    "[102-GS] human signout slot 0 -> 2"
                );
            }

            const hero =
                sky102Hero(
                    member
                );

            occupiedSlots.push(
                playerSlot
            );

            if (
                hero.hero_id >
                0
            ) {
                usedHeroes.push(
                    hero.hero_id
                );
            }

            encodedMembers.push(
                sky102EncodeMember(
                    member,
                    party,
                    encodedMembers.length,
                    playerSlot
                )
            );
        }

        sourceIndex++;
    }

    const humanCount =
        encodedMembers.length;

    if (
        humanCount ===
        0
    ) {
        log(
            "[102-GS] ABORT roster.count=0"
        );

        return 0;
    }

    let botCount =
        0;

    if (
        botDifficulty >
        0
    ) {
        let playerSlot =
            0;

        while (
            playerSlot <
            12
        ) {
            if (
                !sky102ContainsNumber(
                    occupiedSlots,
                    playerSlot
                )
            ) {
                const heroId =
                    sky102ChooseBotHero(
                        usedHeroes,
                        botCount
                    );

                usedHeroes.push(
                    heroId
                );

                encodedMembers.push(
                    sky102EncodeBotMember(
                        playerSlot,
                        heroId,
                        botDifficulty,
                        botCount
                    )
                );

                botCount++;
            }

            playerSlot++;
        }
    }

    log(
        "[102-GS] roster humans=" +
        humanCount +
        " bots=" +
        botCount +
        " total=" +
        encodedMembers.length
    );`,
        "static 12-slot bot roster"
    );

    source = replaceOnce(
        source,
        `    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    if (
        botDifficulty >
        0
    ) {`,
        `    if (
        botDifficulty >
        0
    ) {`,
        "move bot difficulty before roster"
    );

    source = replaceOnce(
        source,
        `function sky102EncodeMember(
    member: any,
    party: any,
    rosterIndex: number
): number[] {`,
        `function sky102EncodeMember(
    member: any,
    party: any,
    rosterIndex: number,
    playerSlot: number
): number[] {`,
        "member encoder signature"
    );

    source = replaceOnce(
        source,
        `    const playerSlot =
        sky102PlayerSlot(
            customSlot,
            rosterIndex
        );

    const team =`,
        `    const team =`,
        "member encoder slot calculation"
    );

    return source;
}

function patchAllocate(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `    sky102UInt(
        staticLobby,
        8,
        1
    );

    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    if (
        botDifficulty >
        0
    ) {
        sky102UInt(
            staticLobby,
            9,
            botDifficulty
        );
    }`,
        `    // ${HERO_RESTORE_MARKER}
    // V1.3 was disproved live: omitting field 8 removed the selected hero
    // and did not create bots. Keep the proven hero assignment for all matches.
    sky102UInt(
        staticLobby,
        8,
        1
    );

    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    if (
        botDifficulty >
        0
    ) {
        sky102UInt(
            staticLobby,
            9,
            botDifficulty
        );
    }`,
        "type102 GC-provided hero policy"
    );

    source = patchStaticBotMembers(source);

    return withEol(source, eol);
}

function patchHost(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `"deadlockStartDedicatedServer(lobbyId, map?) requires lobbyId"`,
        `"deadlockStartDedicatedServer(lobbyId, map?, botDifficulty?) requires lobbyId"`,
        "host usage"
    );

    source = replaceOnce(
        source,
        `        var result =
            DeadlockGcRuntimeServices
                .DedicatedServerStart?
                .Invoke(
                    lobbyId,
                    map
                );`,
        `        // ${MARKERS.host}
        var requestedBotDifficulty =
            args.Length >
            2
                ? Convert.ToUInt32(
                    ToNumber(
                        args[2],
                        "deadlockStartDedicatedServer.botDifficulty"
                    )
                )
                : 0U;

        var botDifficulty =
            Math.Min(
                requestedBotDifficulty,
                5U
            );

        var result =
            DeadlockGcRuntimeServices
                .DedicatedServerStart?
                .Invoke(
                    lobbyId,
                    map,
                    botDifficulty
                );`,
        "host invocation"
    );

    source = replaceOnce(
        source,
        `        _logger.LogInformation(
            "Deadlock dedicated start lobby={LobbyId} started={Started} port={Port} state={State} error={Error}",
            lobbyId,
            result.Started,
            result.Port,
            result.State,
            result.Error
        );`,
        `        _logger.LogInformation(
            "Deadlock dedicated start lobby={LobbyId} botDifficulty={BotDifficulty} bots={Bots} started={Started} port={Port} state={State} error={Error}",
            lobbyId,
            botDifficulty,
            botDifficulty > 0,
            result.Started,
            result.Port,
            result.State,
            result.Error
        );`,
        "host log"
    );

    return withEol(source, eol);
}

function patchRuntime(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `    public static Func<
        ulong,
        string,
        DeadlockDedicatedServerSupervisor.DedicatedLaunchResult
    >? DedicatedServerStart`,
        `    // ${MARKERS.runtime}
    public static Func<
        ulong,
        string,
        uint,
        DeadlockDedicatedServerSupervisor.DedicatedLaunchResult
    >? DedicatedServerStart`,
        "runtime delegate"
    );

    return withEol(source, eol);
}

function patchProgram(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `DeadlockGcRuntimeServices.DedicatedServerStart =
    (lobbyId, map) =>
        deadlockDedicatedServers.Start(
            lobbyId,
            map
        );`,
        `// ${MARKERS.program}
DeadlockGcRuntimeServices.DedicatedServerStart =
    (lobbyId, map, botDifficulty) =>
        deadlockDedicatedServers.Start(
            lobbyId,
            map,
            botDifficulty
        );`,
        "runtime wire"
    );

    return withEol(source, eol);
}

function patchSupervisor(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `    public DedicatedLaunchResult Start(
        ulong lobbyId,
        string? requestedMap)`,
        `    // ${MARKERS.supervisor}
    public DedicatedLaunchResult Start(
        ulong lobbyId,
        string? requestedMap,
        uint requestedBotDifficulty)`,
        "supervisor signature"
    );

    source = replaceOnce(
        source,
        `            var map =
                NormalizeMap(
                    requestedMap,
                    _defaultMap
                );

            var arguments =`,
        `            var map =
                NormalizeMap(
                    requestedMap,
                    _defaultMap
                );

            var botDifficulty =
                Math.Min(
                    requestedBotDifficulty,
                    5U
                );

            var botMatch =
                botDifficulty >
                0;

            var arguments =`,
        "supervisor bot state"
    );

    source = replaceOnce(
        source,
        `            // === SKYNET_DEADLOCK_MM_10023_V52_END ===
            // SKYNET_DEADLOCK_BOTMATCH_PRACTICE_6V6_TEST_V1
            // SKYNET_DEADLOCK_BOTMATCH_EARLY_EXEC_REMOVED_V11
            // Bot cfg moved to citadel_server.cfg so it executes
            // after ResetGameConVarsToDefaults.
            arguments.Add(
                "+map"
            );

            arguments.Add(
                map
            );`,
        `            // === SKYNET_DEADLOCK_MM_10023_V52_END ===

            // ${MARKERS.supervisor}_LAUNCH
            // ${LATE_SERVER_CFG_MARKER}
            // Source 2 executes command-line +exec before map initialization,
            // then ResetGameConVarsToDefaults erases the bot convars.
            // servercfgfile is executed later in the dedicated config phase.
            if (
                botMatch
            )
            {
                arguments.Add(
                    "+servercfgfile"
                );

                arguments.Add(
                    "skynet_botmatch_server.cfg"
                );
            }

            arguments.Add(
                "+map"
            );

            arguments.Add(
                map
            );`,
        "supervisor launch order"
    );

    source = replaceOnce(
        source,
        `                    ["SKYNET_DEDICATED_INSECURE"] =
                        "1"`,
        `                    ["SKYNET_DEDICATED_INSECURE"] =
                        "1",

                    ["SKYNET_DEDICATED_BOT_DIFFICULTY"] =
                        botDifficulty.ToString(
                            System.Globalization.CultureInfo.InvariantCulture
                        ),

                    ["SKYNET_DEDICATED_HAS_BOTS"] =
                        botMatch
                            ? "1"
                            : "0"`,
        "supervisor environment"
    );

    source = replaceOnce(
        source,
        `                _logger.LogInformation(
                    "Started Deadlock dedicated pid {ProcessId} lobby {LobbyId} port {Port} map {Map}. Args: {Arguments}",
                    process.Id,
                    lobbyId,
                    port,
                    map,
                    string.Join(
                        " ",
                        arguments
                    )
                );`,
        `                _logger.LogInformation(
                    "Started Deadlock dedicated pid {ProcessId} lobby {LobbyId} port {Port} map {Map} botDifficulty {BotDifficulty} bots {Bots}. Args: {Arguments}",
                    process.Id,
                    lobbyId,
                    port,
                    map,
                    botDifficulty,
                    botMatch,
                    string.Join(
                        " ",
                        arguments
                    )
                );`,
        "supervisor log"
    );

    return withEol(source, eol);
}

function patchGameCfg(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    source = replaceOnce(
        source,
        `// === SKYNET_DEADLOCK_BOTMATCH_LATE_EXEC_V11_BEGIN ===
// SKYNET Deadlock Custom Match bot-spawn experiment.
//
// Command-line +exec was observed BEFORE map initialization.
// Deadlock then runs ResetGameConVarsToDefaults.
//
// citadel_server.cfg is executed by the dedicated during
// its server-config phase, so execute the Valve bot preset here.
exec citadel_botmatch_practice_6v6.cfg
// === SKYNET_DEADLOCK_BOTMATCH_LATE_EXEC_V11_END ===`,
        `// ${MARKERS.gameCfg}
// Bot presets are selected per match by DeadlockDedicatedServerSupervisor.
// Never enable practice bots globally from this shared server config.`,
        "global bot block"
    );

    return withEol(source, eol);
}

function patchStateDoc(raw: string): string {
    const eol = eolOf(raw);
    let source = normalize(raw);

    requireText(source, "## Current P0", "state P0");

    source = source.replace(/\s*$/, "") + `

## Conditional bot-match V1.6 (installed; live test pending)

Marker: ${MARKERS.stateDoc}
Marker: ${LATE_SERVER_CFG_STATE_MARKER}
Marker: ${HERO_RESTORE_STATE_MARKER}
Marker: ${STATIC_BOT_MEMBERS_STATE_MARKER}
Marker: ${VALIDATED_BOT_HERO_POOL_STATE_MARKER}
Marker: ${HUMAN_SIGNOUT_SLOT_STATE_MARKER}
Marker: ${POSTMATCH_TYPE107_CRASH_GUARD_STATE_MARKER}

Official NetHook 1787497978 evidence:

- bot-match Party SO type105 retained bot_difficulty=3 (Hard), match_mode=2,
  game_mode=1 and one real member;
- the analytics table is bot-participant-driven, not carried by 9166;
- 9166 remains a separate full CMsgAccountStats refresh correction.

Installed behavior:

- PartyStartMatch passes party.bot_difficulty into the dedicated launch;
- bot_difficulty=0 queues no bot preset;
- bot_difficulty=1..5 selects skynet_botmatch_server.cfg;
- Source 2 executes that server cfg after ResetGameConVarsToDefaults;
- the late cfg chains citadel_server.cfg and the Valve 6v6 bot preset;
- type102 retains gc_provided_heroes=true for both bot and no-bot matches;
- V1.3's server-managed-roster hypothesis is intentionally not installed;
- bot matches fill the remaining server slots with type102 bot Members;
- each bot Member carries player_slot, team, hero_id and bot_difficulty=field16;
- a lone human assigned slot 0 in a bot match is remapped to the proven slot 2
  so the dedicated includes the human and MVP in match_data.players;
- the synthetic post-signout type107/9166 refresh is disabled because its
  type107 message caused a confirmed client.dll access violation;
- shared test-game citadel_server.cfg no longer enables bots globally;
- persistence and the proven repeated-match lifecycle are unchanged.

Live acceptance:

1. no-bot match: bots=false, no +exec, no bots, no analytics table;
2. bot match: bots=true, +servercfgfile then +map, bots spawn and the analytics table
   appears after completion.
`;

    return withEol(source, eol);
}

function upgradeInstalledV11(): void {
    if (!installed()) {
        return;
    }

    const raw = read(FILES.partyStart);
    const source = normalize(raw);

    if (source.includes(TYPESHARP_FIX_MARKER)) {
        return;
    }

    const patched = replaceOnce(
        source,
        `    log(
        "[9131-DS] start request party_id=" +
        party.party_id +
        " match_lobby_id=" +
        matchLobbyId +
        " bot_difficulty=" +
        botDifficulty +
        " bots=" +
        botMatch
    );`,
        `    // ${TYPESHARP_FIX_MARKER}
    log(
        "[9131-DS] start request party_id=" +
        party.party_id +
        " match_lobby_id=" +
        matchLobbyId +
        " bot_difficulty=" +
        botDifficulty
    );

    if (botMatch) {
        log("[9131-DS] bots=true");
    }
    else {
        log("[9131-DS] bots=false");
    }`,
        "V1 TypeSharp boolean log"
    );

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-conditional-bots-v11-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\party-RequestDeadlockPartyStartMatch.ts",
        raw,
        "utf8"
    );

    fs.writeFileSync(
        FILES.partyStart,
        withEol(patched, eolOf(raw)),
        "utf8"
    );

    console.log("[upgrade] CONDITIONAL BOT MATCH V1 -> V1.1");
    console.log("[backup] " + backupRoot);
}

upgradeInstalledV11();

function upgradeInstalledV12(): void {
    if (!installed()) {
        return;
    }

    const supervisorRaw = read(FILES.supervisor);
    let supervisor = normalize(supervisorRaw);
    let supervisorChanged = false;

    if (!supervisor.includes(LATE_SERVER_CFG_MARKER)) {
        supervisor = replaceOnce(
            supervisor,
            `            arguments.Add(
                "+map"
            );

            arguments.Add(
                map
            );

            // ${MARKERS.supervisor}_LAUNCH
            // +exec-before-+map was reset by ResetGameConVarsToDefaults.
            // Queue the Valve preset only for bot matches and after +map.
            if (
                botMatch
            )
            {
                arguments.Add(
                    "+exec"
                );

                arguments.Add(
                    "citadel_botmatch_practice_6v6.cfg"
                );
            }`,
            `            // ${MARKERS.supervisor}_LAUNCH
            // ${LATE_SERVER_CFG_MARKER}
            // Source 2 executes command-line +exec before map initialization,
            // then ResetGameConVarsToDefaults erases the bot convars.
            // servercfgfile is executed later in the dedicated config phase.
            if (
                botMatch
            )
            {
                arguments.Add(
                    "+servercfgfile"
                );

                arguments.Add(
                    "skynet_botmatch_server.cfg"
                );
            }

            arguments.Add(
                "+map"
            );

            arguments.Add(
                map
            );`,
            "V1.2 late server cfg launch"
        );

        supervisorChanged = true;
    }

    const botCfgExists =
        fs.existsSync(FILES.botServerCfg);

    if (botCfgExists) {
        const existingBotCfg =
            normalize(read(FILES.botServerCfg));

        if (
            existingBotCfg !==
            normalize(BOT_SERVER_CFG)
        ) {
            fail(
                "[baseline] existing skynet_botmatch_server.cfg is not owned by V1.2"
            );
        }
    }

    const stateRaw = read(FILES.stateDoc);
    let state = normalize(stateRaw);
    let stateChanged = false;

    if (!state.includes(LATE_SERVER_CFG_STATE_MARKER)) {
        state = state.replace(/\s*$/, "") + `

## Conditional bot-match launch V1.2 (installed; live test pending)

Marker: ${LATE_SERVER_CFG_STATE_MARKER}

Live V1.1 evidence showed bot_difficulty=3 and +exec were selected correctly,
but console.log proved the preset executed before ResetGameConVarsToDefaults.
V1.2 selects skynet_botmatch_server.cfg for bot matches so Source 2 runs the
base server cfg and Valve bot preset in the later dedicated config phase.
No-bot matches retain the ordinary citadel_server.cfg path.
`;

        stateChanged = true;
    }

    if (
        !supervisorChanged &&
        botCfgExists &&
        !stateChanged
    ) {
        return;
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-conditional-bots-v12-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\supervisor-DeadlockDedicatedServerSupervisor.cs",
        supervisorRaw,
        "utf8"
    );
    fs.writeFileSync(
        backupRoot +
            "\\state-DEADLOCK_GC_STATE.md",
        stateRaw,
        "utf8"
    );

    if (botCfgExists) {
        fs.writeFileSync(
            backupRoot +
                "\\game-skynet_botmatch_server.cfg",
            read(FILES.botServerCfg),
            "utf8"
        );
    }

    if (supervisorChanged) {
        fs.writeFileSync(
            FILES.supervisor,
            withEol(supervisor, eolOf(supervisorRaw)),
            "utf8"
        );
    }

    if (!botCfgExists) {
        fs.writeFileSync(
            FILES.botServerCfg,
            BOT_SERVER_CFG,
            "utf8"
        );
    }

    if (stateChanged) {
        fs.writeFileSync(
            FILES.stateDoc,
            withEol(state, eolOf(stateRaw)),
            "utf8"
        );
    }

    console.log("[upgrade] CONDITIONAL BOT MATCH V1.1 -> V1.2");
    console.log("[backup] " + backupRoot);
}

upgradeInstalledV12();

function rollbackInstalledV13(): void {
    if (!installed()) {
        return;
    }

    const allocateRaw = read(FILES.allocate);
    let allocate = allocateRaw;
    let allocateChanged = false;

    if (allocateRaw.includes(SERVER_BOT_ROSTER_MARKER)) {
        allocate = replaceOnce(
            normalize(allocateRaw),
            `    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    // ${SERVER_BOT_ROSTER_MARKER}
    // In bot matches the dedicated must choose and precache bot heroes.
    // Field 8 defaults to false when omitted.
    if (
        botDifficulty ===
        0
    ) {
        sky102UInt(
            staticLobby,
            8,
            1
        );
    }

    if (
        botDifficulty >
        0
    ) {
        sky102UInt(
            staticLobby,
            9,
            botDifficulty
        );
    }`,
            `    // ${HERO_RESTORE_MARKER}
    // V1.3 was disproved live: omitting field 8 removed the selected hero
    // and did not create bots. Keep the proven hero assignment for all matches.
    sky102UInt(
        staticLobby,
        8,
        1
    );

    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    if (
        botDifficulty >
        0
    ) {
        sky102UInt(
            staticLobby,
            9,
            botDifficulty
        );
    }`,
            "rollback V1.3 type102 hero policy"
        );

        allocate = replaceOnce(
            allocate,
            `    if (
        botDifficulty >
        0
    ) {
        log(
            "[102-GS] gc_provided_heroes=false bot_roster=server-managed"
        );
    }
    else {
        log(
            "[102-GS] gc_provided_heroes=true bot_roster=none"
        );
    }`,
            `    log(
        "[102-GS] gc_provided_heroes=true"
    );`,
            "rollback V1.3 type102 hero log"
        );

        allocate = withEol(allocate, eolOf(allocateRaw));
        allocateChanged = true;
    }
    else if (!allocateRaw.includes(HERO_RESTORE_MARKER)) {
        allocate = patchAllocate(allocateRaw);
        allocateChanged = true;
    }

    const stateRaw = read(FILES.stateDoc);
    let state = normalize(stateRaw);
    let stateChanged = false;

    if (!state.includes(HERO_RESTORE_STATE_MARKER)) {
        state = state.replace(/\s*$/, "") + `

## Conditional bot-match V1.3 rollback (hero path restored)

Marker: ${HERO_RESTORE_STATE_MARKER}

Live V1.3 disproved the server-managed-roster hypothesis. Omitting type102
gc_provided_heroes removed the selected player hero, while the dedicated still
created no bot fake clients. The proven unconditional gc_provided_heroes=true
path is restored. Bot creation remains unresolved and requires a separate,
evidence-backed change.
`;

        stateChanged = true;
    }

    if (
        !allocateChanged &&
        !stateChanged
    ) {
        return;
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-conditional-bots-v13-rollback-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\allocate-RequestDeadlockAllocateForMatchResponseRaw.ts",
        allocateRaw,
        "utf8"
    );
    fs.writeFileSync(
        backupRoot +
            "\\state-DEADLOCK_GC_STATE.md",
        stateRaw,
        "utf8"
    );

    if (allocateChanged) {
        fs.writeFileSync(
            FILES.allocate,
            allocate,
            "utf8"
        );
    }

    if (stateChanged) {
        fs.writeFileSync(
            FILES.stateDoc,
            withEol(state, eolOf(stateRaw)),
            "utf8"
        );
    }

    console.log("[rollback] CONDITIONAL BOT MATCH V1.3 -> V1.3R HERO RESTORE");
    console.log("[backup] " + backupRoot);
}

rollbackInstalledV13();

function upgradeInstalledV14(): void {
    if (!installed()) {
        return;
    }

    const allocateRaw = read(FILES.allocate);
    let allocate = allocateRaw;
    let allocateChanged = false;

    if (!allocateRaw.includes(STATIC_BOT_MEMBERS_MARKER)) {
        allocate = withEol(
            patchStaticBotMembers(
                normalize(allocateRaw)
            ),
            eolOf(allocateRaw)
        );
        allocateChanged = true;
    }

    const stateRaw = read(FILES.stateDoc);
    let state = normalize(stateRaw);
    let stateChanged = false;

    if (!state.includes(STATIC_BOT_MEMBERS_STATE_MARKER)) {
        state = state.replace(/\s*$/, "") + `

## Conditional bot-match V1.4 (static bot members; live test pending)

Marker: ${STATIC_BOT_MEMBERS_STATE_MARKER}

Official server protobuf evidence defines bot_difficulty on each
CSOCitadelServerStaticLobby.Member as field 16. Live V1.2/V1.3 showed the
outer bot_difficulty and practice cfg were insufficient: only the human Member
was present and the server precached one hero. V1.4 retains the restored human
hero path and fills unoccupied 6v6 player slots with bot Members before the
game-session manifest is built. No-bot matches still publish humans only.
`;
        stateChanged = true;
    }

    if (
        !allocateChanged &&
        !stateChanged
    ) {
        return;
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-conditional-bots-v14-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\allocate-RequestDeadlockAllocateForMatchResponseRaw.ts",
        allocateRaw,
        "utf8"
    );
    fs.writeFileSync(
        backupRoot +
            "\\state-DEADLOCK_GC_STATE.md",
        stateRaw,
        "utf8"
    );

    if (allocateChanged) {
        fs.writeFileSync(
            FILES.allocate,
            allocate,
            "utf8"
        );
    }

    if (stateChanged) {
        fs.writeFileSync(
            FILES.stateDoc,
            withEol(state, eolOf(stateRaw)),
            "utf8"
        );
    }

    console.log("[upgrade] CONDITIONAL BOT MATCH V1.3R -> V1.4");
    console.log("[backup] " + backupRoot);
}

upgradeInstalledV14();

function upgradeInstalledV15(): void {
    if (!installed()) {
        return;
    }

    const allocateRaw = read(FILES.allocate);
    let allocate = normalize(allocateRaw);
    let allocateChanged = false;

    if (!allocate.includes(VALIDATED_BOT_HERO_POOL_MARKER)) {
        requireText(
            allocate,
            STATIC_BOT_MEMBERS_MARKER,
            "V1.4 static bot members before V1.5"
        );

        allocate = replaceOnce(
            allocate,
            `    // Valid hero IDs observed in the official 1787497978 bot-match Party SO.
    const candidates = [
        7, 1, 27, 31, 23, 22,
        2, 5, 28, 19, 8, 14,
        44, 24, 3, 52, 21, 9,
        45, 15, 39, 38, 11, 10
    ];`,
            `    // ${VALIDATED_BOT_HERO_POOL_MARKER}
    // The first seven IDs were accepted by this dedicated build in the V1.4
    // live test. The remaining IDs come from this project's captured account
    // hero dataset; known cross-build failures 23/22/5/28 are excluded.
    const candidates = [
        7, 1, 27, 31, 2, 19,
        8, 14, 3, 11, 16, 18,
        25, 35, 50, 58, 63, 64,
        65, 67, 69, 72, 76, 77,
        79, 80
    ];`,
            "V1.4 cross-build hero pool"
        );

        allocateChanged = true;
    }

    const stateRaw = read(FILES.stateDoc);
    let state = normalize(stateRaw);
    let stateChanged = false;

    if (!state.includes(VALIDATED_BOT_HERO_POOL_STATE_MARKER)) {
        state = state.replace(/\s*$/, "") + `

## Conditional bot-match V1.5 (live-build hero pool; live test pending)

Marker: ${VALIDATED_BOT_HERO_POOL_STATE_MARKER}

Live V1.4 proved the 12-slot static roster path and produced working bot-driven
post-match analytics, but the dedicated created only seven of eleven bots. Its
console received all eleven bot Members and rejected hero IDs 23, 22, 5 and 28
before fake-client creation. V1.5 removes those cross-build IDs, leads with the
seven IDs accepted in that live run, and fills the remaining unique choices from
the captured hero dataset used by this build. Ordinary no-bot matches are
unchanged.
`;
        stateChanged = true;
    }

    if (
        !allocateChanged &&
        !stateChanged
    ) {
        return;
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-conditional-bots-v15-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\allocate-RequestDeadlockAllocateForMatchResponseRaw.ts",
        allocateRaw,
        "utf8"
    );
    fs.writeFileSync(
        backupRoot +
            "\\state-DEADLOCK_GC_STATE.md",
        stateRaw,
        "utf8"
    );

    if (allocateChanged) {
        fs.writeFileSync(
            FILES.allocate,
            withEol(allocate, eolOf(allocateRaw)),
            "utf8"
        );
    }

    if (stateChanged) {
        fs.writeFileSync(
            FILES.stateDoc,
            withEol(state, eolOf(stateRaw)),
            "utf8"
        );
    }

    console.log("[upgrade] CONDITIONAL BOT MATCH V1.4 -> V1.5");
    console.log("[backup] " + backupRoot);
}

upgradeInstalledV15();

function upgradeInstalledV16(): void {
    if (!installed()) {
        return;
    }

    const allocateRaw = read(FILES.allocate);
    let allocate = normalize(allocateRaw);
    let allocateChanged = false;

    if (!allocate.includes(HUMAN_SIGNOUT_SLOT_MARKER)) {
        requireText(
            allocate,
            VALIDATED_BOT_HERO_POOL_MARKER,
            "V1.5 validated hero pool before V1.6"
        );

        allocate = replaceOnce(
            allocate,
            `function sky102EncodeMember(
    member: any,
    party: any,
    rosterIndex: number
): number[] {`,
            `function sky102EncodeMember(
    member: any,
    party: any,
    rosterIndex: number,
    playerSlot: number
): number[] {`,
            "V1.5 member encoder signature"
        );

        allocate = replaceOnce(
            allocate,
            `    const playerSlot =
        sky102PlayerSlot(
            customSlot,
            rosterIndex
        );

    const team =`,
            `    const team =`,
            "V1.5 member encoder slot calculation"
        );

        allocate = replaceOnce(
            allocate,
            `            const playerSlot =
                sky102PlayerSlot(
                    customSlot,
                    encodedMembers.length
                );

            const hero =`,
            `            let playerSlot =
                sky102PlayerSlot(
                    customSlot,
                    encodedMembers.length
                );

            // ${HUMAN_SIGNOUT_SLOT_MARKER}
            // Live A/B evidence from this dedicated build:
            // - one human in slot 2 was emitted in match_data.players;
            // - the same human in slot 0 was omitted from match_data.players,
            //   although the server still calculated that player as MVP;
            // - bots are emitted normally in slot 0.
            // Keep the workaround limited to the proven single-human bot path.
            if (
                botDifficulty >
                    0 &&
                partyMembers.length ===
                    1 &&
                playerSlot ===
                    0
            ) {
                playerSlot =
                    2;

                log(
                    "[102-GS] human signout slot 0 -> 2"
                );
            }

            const hero =`,
            "V1.5 roster slot calculation"
        );

        allocate = replaceOnce(
            allocate,
            `                sky102EncodeMember(
                    member,
                    party,
                    encodedMembers.length
                )`,
            `                sky102EncodeMember(
                    member,
                    party,
                    encodedMembers.length,
                    playerSlot
                )`,
            "V1.5 member encoder call"
        );

        allocateChanged = true;
    }

    const stateRaw = read(FILES.stateDoc);
    let state = normalize(stateRaw);
    let stateChanged = false;

    if (!state.includes(HUMAN_SIGNOUT_SLOT_STATE_MARKER)) {
        state = state.replace(/\s*$/, "") + `

## Conditional bot-match V1.6 (human signout slot; live test pending)

Marker: ${HUMAN_SIGNOUT_SLOT_STATE_MARKER}

Live V1.5 confirmed all eleven bots spawn and the dedicated computes the human
as MVP. A direct A/B comparison isolated the missing post-match human row to the
single-human bot roster using player_slot=0: that match omitted account 100000
from match_data.players, while the earlier player_slot=2 match emitted the human,
full stats and account-stat changes. Bots themselves are valid in player_slot=0.
V1.6 therefore remaps only a single real human in a bot match from server slot 0
to the already proven slot 2; the freed slot 0 remains available to a bot. The
12-player roster, hero pool, no-bot path and repeated-match lifecycle are unchanged.
`;
        stateChanged = true;
    }

    if (
        !allocateChanged &&
        !stateChanged
    ) {
        return;
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-conditional-bots-v16-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\allocate-RequestDeadlockAllocateForMatchResponseRaw.ts",
        allocateRaw,
        "utf8"
    );
    fs.writeFileSync(
        backupRoot +
            "\\state-DEADLOCK_GC_STATE.md",
        stateRaw,
        "utf8"
    );

    if (allocateChanged) {
        fs.writeFileSync(
            FILES.allocate,
            withEol(allocate, eolOf(allocateRaw)),
            "utf8"
        );
    }

    if (stateChanged) {
        fs.writeFileSync(
            FILES.stateDoc,
            withEol(state, eolOf(stateRaw)),
            "utf8"
        );
    }

    console.log("[upgrade] CONDITIONAL BOT MATCH V1.5 -> V1.6");
    console.log("[backup] " + backupRoot);
}

upgradeInstalledV16();

function upgradeInstalledV17(): void {
    if (!installed()) {
        return;
    }

    const signoutRaw = read(FILES.signout);
    let signout = signoutRaw;
    let signoutChanged = false;

    if (!signoutRaw.includes(POSTMATCH_TYPE107_CRASH_GUARD_MARKER)) {
        signout = patchPostMatchType107CrashGuard(signoutRaw);
        signoutChanged = true;
    }

    const stateRaw = read(FILES.stateDoc);
    let state = normalize(stateRaw);
    let stateChanged = false;

    if (!state.includes(POSTMATCH_TYPE107_CRASH_GUARD_STATE_MARKER)) {
        state = state.replace(/\s*$/, "") + `

## Post-match V1.7 (synthetic type107 crash guard; live confirmed)

Marker: ${POSTMATCH_TYPE107_CRASH_GUARD_STATE_MARKER}

Live evidence from match 101787557354226001 proved the dedicated signout itself
was complete: account 100000, hero 1, player_slot 6, full player stats, account
stat changes and server-calculated MVP were present. The client successfully
retrieved PostMatch 26 (97 bytes) and CacheUnsubscribed 25 (22 bytes), then
retrieved the synthetic type107 26 (53 bytes) and immediately wrote an access
violation dump. It never retrieved the queued 9166. The dump records C0000005,
a read from address 0xB inside client.dll+0x1DC7145. V1.7 disables only the
unverified synthetic type107/9166 refresh. The genuine bot-driven match table,
human/MVP result, P0 lifecycle, 12-player roster and persistence policy remain.

Live acceptance confirmed:

- all eleven bots were present;
- account 100000 appeared in the post-match table with full statistics;
- MVP rendered correctly;
- the client completed the post-match flow without crashing.
`;
        stateChanged = true;
    }

    if (
        !signoutChanged &&
        !stateChanged
    ) {
        return;
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const backupRoot =
        TOOLS_ROOT +
        "\\backup-postmatch-type107-crash-guard-v17-" +
        timestamp;

    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
        backupRoot +
            "\\signout-RequestDeadlockMatchSignoutRaw.ts",
        signoutRaw,
        "utf8"
    );
    fs.writeFileSync(
        backupRoot +
            "\\state-DEADLOCK_GC_STATE.md",
        stateRaw,
        "utf8"
    );

    if (signoutChanged) {
        fs.writeFileSync(
            FILES.signout,
            signout,
            "utf8"
        );
    }

    if (stateChanged) {
        fs.writeFileSync(
            FILES.stateDoc,
            withEol(state, eolOf(stateRaw)),
            "utf8"
        );
    }

    console.log("[upgrade] POSTMATCH V1.6 -> V1.7 TYPE107 CRASH GUARD");
    console.log("[backup] " + backupRoot);
}

upgradeInstalledV17();

if (verify()) {
    process.exit(0);
}

const originals = {
    partyStart: read(FILES.partyStart),
    allocate: read(FILES.allocate),
    signout: read(FILES.signout),
    host: read(FILES.host),
    runtime: read(FILES.runtime),
    program: read(FILES.program),
    supervisor: read(FILES.supervisor),
    gameCfg: read(FILES.gameCfg),
    stateDoc: read(FILES.stateDoc)
};

for (const [key, marker] of Object.entries(MARKERS)) {
    const original = originals[key as keyof typeof originals];

    if (original.includes(marker)) {
        fail("[partial] marker already exists: " + marker);
    }
}

if (fs.existsSync(FILES.botServerCfg)) {
    fail(
        "[baseline] skynet_botmatch_server.cfg already exists before installation"
    );
}

// Strict baselines are checked before any write.
requireText(
    normalize(originals.partyStart),
    `deadlockStartDedicatedServer(
            matchLobbyId
        );`,
    "party old call"
);

requireText(
    normalize(originals.allocate),
    `    sky102UInt(
        staticLobby,
        8,
        1
    );`,
    "type102 old GC-provided hero policy"
);

requireText(
    normalize(originals.signout),
    `    const postMatchAnalyticsQueued =
        deadlockQueueCurrentPostMatchAnalytics();`,
    "synthetic postmatch analytics call"
);

requireText(
    normalize(originals.host),
    `"deadlockStartDedicatedServer(lobbyId, map?) requires lobbyId"`,
    "host old usage"
);

requireText(
    normalize(originals.runtime),
    `ulong,
        string,
        DeadlockDedicatedServerSupervisor.DedicatedLaunchResult`,
    "runtime old signature"
);

requireText(
    normalize(originals.program),
    "(lobbyId, map) =>",
    "program old wire"
);

requireText(
    normalize(originals.supervisor),
    `public DedicatedLaunchResult Start(
        ulong lobbyId,
        string? requestedMap)`,
    "supervisor old signature"
);

requireText(
    normalize(originals.gameCfg),
    "exec citadel_botmatch_practice_6v6.cfg",
    "global bot exec"
);

requireText(
    normalize(originals.host),
    "SKYNET_DEADLOCK_REAL_10014_DECODER_V2_HOST",
    "protected decoder V2"
);

requireText(
    normalize(originals.supervisor),
    "SKYNET_DEADLOCK_DEDICATED_STEAMID_GUARD_V1_METHOD",
    "protected dedicated guard"
);

const patched = {
    partyStart: patchPartyStart(originals.partyStart),
    allocate: patchAllocate(originals.allocate),
    signout: patchPostMatchType107CrashGuard(originals.signout),
    host: patchHost(originals.host),
    runtime: patchRuntime(originals.runtime),
    program: patchProgram(originals.program),
    supervisor: patchSupervisor(originals.supervisor),
    gameCfg: patchGameCfg(originals.gameCfg),
    stateDoc: patchStateDoc(originals.stateDoc)
};

const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

const backupRoot =
    TOOLS_ROOT +
    "\\backup-conditional-bots-v1-" +
    timestamp;

fs.mkdirSync(backupRoot, { recursive: true });

const backupNames = {
    partyStart: "party-RequestDeadlockPartyStartMatch.ts",
    allocate: "allocate-RequestDeadlockAllocateForMatchResponseRaw.ts",
    signout: "signout-RequestDeadlockMatchSignoutRaw.ts",
    host: "host-GameCoordinatorScriptPlugin.cs",
    runtime: "runtime-DeadlockGcRuntimeServices.cs",
    program: "program-Program.cs",
    supervisor: "supervisor-DeadlockDedicatedServerSupervisor.cs",
    gameCfg: "game-citadel_server.cfg",
    stateDoc: "state-DEADLOCK_GC_STATE.md"
};

for (const [key, original] of Object.entries(originals)) {
    fs.writeFileSync(
        backupRoot + "\\" + backupNames[key as keyof typeof backupNames],
        original,
        "utf8"
    );
}

for (const [key, value] of Object.entries(patched)) {
    fs.writeFileSync(
        FILES[key as keyof typeof FILES],
        value,
        "utf8"
    );
}

fs.writeFileSync(
    FILES.botServerCfg,
    BOT_SERVER_CFG,
    "utf8"
);

if (!verify()) {
    fail("[verify] installation did not converge");
}

console.log("[install] POSTMATCH V1.7 TYPE107 CRASH GUARD installed");
console.log("[backup] " + backupRoot);
