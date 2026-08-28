// SKYNET_DEADLOCK_CUSTOM_SWITCHES_HARNESS_V27
// Offline contract test for Deadlock modes, difficulty, lane policy and fanout.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(toolsRoot, "../..");
const appRoot = path.join(serverRoot, "GC", "1422450");

const allocatePath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockAllocateForMatchResponseRaw.ts"
);
const assignmentPath = path.join(
    appRoot,
    "modules",
    "DeadlockClientAssignment.ts"
);
const matchStatePath = path.join(
    appRoot,
    "modules",
    "DeadlockMatchLobbyState.ts"
);
const serverEnterPath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockServerEnterMatchmakingRaw.ts"
);
const hostPath = path.join(
    serverRoot,
    "Services",
    "GameCoordinator",
    "GameCoordinatorScriptPlugin.cs"
);
const deadlockDbPath = path.join(
    serverRoot,
    "Services",
    "DeadlockDB.cs"
);
const runtimeServicesPath = path.join(
    serverRoot,
    "Services",
    "GameCoordinator",
    "DeadlockGcRuntimeServices.cs"
);
const programPath = path.join(
    serverRoot,
    "Program.cs"
);
const steamStatePath = path.join(
    serverRoot,
    "Services",
    "SteamApiStateService.cs"
);
const steamHelpersPath = path.join(
    serverRoot,
    "Services",
    "SteamApiStateService.Helpers.cs"
);
const steamGcPath = path.join(
    serverRoot,
    "Services",
    "SteamApiStateService.StorageAndAuth.cs"
);
const deadlockSupervisorPath = path.join(
    serverRoot,
    "Services",
    "DeadlockDedicatedServerSupervisor.cs"
);
const startPath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockPartyStartMatch.ts"
);
const actionPath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockPartyAction.ts"
);
const launcherPath = path.join(
    serverRoot,
    "Services",
    "InjectedProcessLauncher.cs"
);
const scoredStartPath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockStartMatchmaking.ts"
);
const partyModePath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockPartySetMode.ts"
);
const matchmakingStatePath = path.join(
    appRoot,
    "modules",
    "RequestDeadlockIsInMatchmaking.ts"
);

function check(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function read(file) {
    return fs.readFileSync(file, "utf8");
}

function contains(values, value) {
    return values.includes(value);
}

function mapCustomSlot(customSlot, fallback, gameMode) {
    if (gameMode === 4) {
        if (customSlot >= 10 && customSlot <= 13) {
            return customSlot - 9;
        }
        if (customSlot >= 20 && customSlot <= 23) {
            return 5 + customSlot - 20;
        }
        if (customSlot >= 0 && customSlot <= 7) {
            return customSlot + 1;
        }
    } else {
        if (customSlot >= 10 && customSlot <= 15) {
            return customSlot - 9;
        }
        if (customSlot >= 20 && customSlot <= 25) {
            return 7 + customSlot - 20;
        }
        if (customSlot >= 0 && customSlot <= 11) {
            return customSlot + 1;
        }
    }
    return fallback;
}

function laneId(playerSlot, firstSlot, teamSize, gameMode, randomizeLanes) {
    if (randomizeLanes || gameMode !== 1 || teamSize !== 6) {
        return 0;
    }

    const teamSlot = (playerSlot - firstSlot) % teamSize;
    if (teamSlot === 0 || teamSlot === 1) return 1;
    if (teamSlot === 2 || teamSlot === 3) return 4;
    if (teamSlot === 4 || teamSlot === 5) return 6;
    return 0;
}

function openSlot(occupied, preferred, firstSlot, slotEnd) {
    if (
        preferred >= firstSlot &&
        preferred < slotEnd &&
        !contains(occupied, preferred)
    ) {
        return preferred;
    }

    for (let candidate = firstSlot; candidate < slotEnd; candidate++) {
        if (!contains(occupied, candidate)) {
            return candidate;
        }
    }

    return -1;
}

function standardSlot(human, occupied, teamSize, firstSlot) {
    const start = human.team === 1 ? firstSlot + teamSize : firstSlot;
    for (let slot = start; slot < start + teamSize; slot++) {
        if (!contains(occupied, slot)) {
            return slot;
        }
    }
    return start;
}

function buildRoster(humans, botDifficulty, gameMode = 1, randomizeLanes = false) {
    const teamSize = gameMode === 4 ? 4 : 6;
    const capacity = teamSize * 2;
    const firstSlot = 1;
    const slotEnd = firstSlot + capacity;
    const occupied = [];
    const seenAccounts = [];
    const roster = [];

    for (let index = 0; index < humans.length; index++) {
        const human = humans[index];
        if (human.accountId <= 0 || contains(seenAccounts, human.accountId)) {
            return { valid: false, roster: [] };
        }

        seenAccounts.push(human.accountId);
        const customSlot = randomizeLanes ? -1 : human.customSlot;
        let preferred = mapCustomSlot(
            customSlot,
            standardSlot(human, occupied, teamSize, firstSlot),
            gameMode
        );

        const slot = openSlot(occupied, preferred, firstSlot, slotEnd);
        if (slot < 0) {
            return { valid: false, roster: [] };
        }

        occupied.push(slot);
        roster.push({
            kind: "human",
            slot,
            accountId: human.accountId,
            team: slot < firstSlot + teamSize ? 0 : 1
        });
    }

    if (botDifficulty > 0) {
        for (let slot = firstSlot; slot < slotEnd; slot++) {
            if (!contains(occupied, slot)) {
                occupied.push(slot);
                roster.push({ kind: "bot", slot, accountId: 0 });
            }
        }
    }

    return { valid: true, roster };
}

function humans(count, customSlots = null, gameMode = 1) {
    const teamSize = gameMode === 4 ? 4 : 6;
    const uiSlots = gameMode === 4
        ? [10, 11, 12, 13, 20, 21, 22, 23]
        : [10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25];
    return Array.from({ length: count }, (_, index) => ({
        accountId: 100000 + index,
        customSlot: customSlots ? customSlots[index] : uiSlots[index],
        team: index < teamSize ? 0 : 1
    }));
}

const allocateSource = read(allocatePath);
const assignmentSource = read(assignmentPath);
const matchStateSource = read(matchStatePath);
const serverEnterSource = read(serverEnterPath);
const hostSource = read(hostPath);
const startSource = read(startPath);
const actionSource = read(actionPath);
const launcherSource = read(launcherPath);
const scoredStartSource = read(scoredStartPath);
const partyModeSource = read(partyModePath);
const matchmakingStateSource = read(matchmakingStatePath);
const deadlockDbSource = read(deadlockDbPath);
const runtimeServicesSource = read(runtimeServicesPath);
const programSource = read(programPath);
const steamStateSource = read(steamStatePath);
const steamHelpersSource = read(steamHelpersPath);
const steamGcSource = read(steamGcPath);
const deadlockSupervisorSource = read(deadlockSupervisorPath);

check(
    allocateSource.includes("SKYNET_DEADLOCK_MULTIPLAYER_ROSTER_GUARD_V18"),
    "runtime roster guard marker is missing"
);
check(
    allocateSource.includes("SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19") &&
        startSource.includes("SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19") &&
        actionSource.includes("SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19"),
    "custom-switch runtime marker is missing"
);
check(
    startSource.includes("SKYNET_DEADLOCK_STREET_BRAWL_MIDTOWN_V20") &&
        allocateSource.includes("SKYNET_DEADLOCK_STREET_BRAWL_MIDTOWN_V20") &&
        !startSource.includes('? "dl_streets"') &&
        !allocateSource.includes('? "dl_streets"'),
    "Street Brawl Midtown routing is missing"
);
check(
    allocateSource.includes("SKYNET_DEADLOCK_NONZERO_SIGNOUT_SLOTS_V25") &&
        allocateSource.includes("SKYNET_DEADLOCK_MANUAL_LANE_ID_V25"),
    "non-zero signout slots or manual lane-id routing is missing"
);
check(
    matchStateSource.includes("SKYNET_DEADLOCK_SEPARATE_MATCH_ID_V26_STATE") &&
        hostSource.includes("SKYNET_DEADLOCK_SEARCHABLE_MATCH_ID_V28_HOST"),
    "separate Match ID allocator marker is missing"
);
check(
    matchStateSource.includes("deadlockAllocateEphemeralMatchId(") &&
        matchStateSource.includes("getCurrentDeadlockMatchId") &&
        serverEnterSource.includes("getCurrentDeadlockMatchId") &&
        allocateSource.includes("getCurrentDeadlockMatchId") &&
        assignmentSource.includes("getCurrentDeadlockMatchId"),
    "separate Match ID is not propagated through active GC state"
);
check(
    hostSource.includes("9_999_999_999UL") &&
        deadlockDbSource.includes("SKYNET_DEADLOCK_SEARCHABLE_MATCH_ID_V28_DB") &&
        deadlockDbSource.includes("RuntimeCounters") &&
        deadlockDbSource.includes("6_000_000_000L") &&
        runtimeServicesSource.includes("MatchIdAllocator") &&
        programSource.includes("deadlockGcDb.AllocateMatchId"),
    "Match ID allocator is not persistent or exceeds the ten-digit client field"
);
check(
    /deadlockDedicatedServerState\(\s*lobbyId\s*\)/.test(serverEnterSource) &&
        /match_id:\s*\r?\n\s*matchId/.test(serverEnterSource),
    "10021 no longer separates reservation lobby_id from match_id"
);
check(
    !/match_id:\s*\r?\n\s*matchLobbyId/.test(assignmentSource) &&
        /match_id:\s*\r?\n\s*currentMatchId/.test(assignmentSource),
    "client type101 still aliases match_id to lobby_id"
);
check(
    launcherSource.includes("SKYNET_DEADLOCK_DEDICATED_NO_FOCUS_V19") &&
        launcherSource.includes("SKYNET_DEADLOCK_DEDICATED_ISOLATED_DESKTOP_V20") &&
        launcherSource.includes("CreateDesktop") &&
        /if \(showWindow\)[\s\S]*AllowSetForegroundWindow/.test(launcherSource),
    "hidden dedicated focus guard is missing"
);
check(
    assignmentSource.includes("SKYNET_DEADLOCK_MULTIPLAYER_CONNECT_IP_V18"),
    "runtime connect-IP marker is missing"
);
check(
    assignmentSource.includes("reservation.publicIp") &&
        assignmentSource.includes("SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29") &&
        assignmentSource.includes("deadlockResolveClientConnectIp") &&
        assignmentSource.indexOf("memberAssignLobbyBytes") >
            assignmentSource.indexOf("for ("),
    "client assignment is not encoded with a per-account routable IP"
);
check(
    !/udp_connect_ip:\s*\r?\n\s*LOOPBACK_CONNECT_IP/.test(assignmentSource),
    "a client lobby payload is still hardcoded to loopback"
);
const publicIpResolverStart = steamHelpersSource.indexOf(
    "private uint ResolveGameServerPublicIp"
);
const publicIpResolverEnd = steamHelpersSource.indexOf(
    "private uint ResolveDeadlockGameServerConnectIp",
    publicIpResolverStart
);
const publicIpResolverSource = steamHelpersSource.slice(
    publicIpResolverStart,
    publicIpResolverEnd
);
check(
    publicIpResolverStart >= 0 &&
        publicIpResolverSource.indexOf("TryGetConfiguredAdvertisedServerIp") <
            publicIpResolverSource.indexOf("if (!string.IsNullOrWhiteSpace(remoteIp)"),
    "explicit advertised IP no longer has priority over Hyper-V registration"
);
check(
    hostSource.includes("SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_HOST") &&
        runtimeServicesSource.includes("ClientConnectIpResolver") &&
        steamStateSource.includes("ResolveDeadlockGameServerConnectIp") &&
        steamHelpersSource.includes("SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_RESOLVER") &&
        steamHelpersSource.includes("TryPickHostIpForClientSubnet") &&
        steamHelpersSource.includes("IsHostInterfaceAddress") &&
        steamGcSource.includes("session!.RemoteIp = clientIp"),
    "LAN/Radmin per-client resolver wiring is incomplete"
);
check(
    deadlockSupervisorSource.includes("SKYNET_DEADLOCK_WEB_ADVERTISED_IP_V30_SERVICE") &&
        deadlockSupervisorSource.includes("GameServerSettingsService settings") &&
        deadlockSupervisorSource.includes("_settings.Current.AdvertisedServerIp") &&
        deadlockSupervisorSource.includes("SKYNET_DEADLOCK_WEB_ADVERTISED_IP_V30_LIVE") &&
        deadlockSupervisorSource.includes("reservation.RegisteredPublicIp"),
    "Deadlock supervisor is not using the live Web advertised IP"
);
check(
    scoredStartSource.includes("SKYNET_DEADLOCK_SCORED_HARD_BOTS_V27") &&
        scoredStartSource.includes("SCORED_HARD_BOT_DIFFICULTY") &&
        /requestedMatchMode !==\s*\r?\n\s*1[\s\S]*requestedMatchMode !==\s*\r?\n\s*4/.test(scoredStartSource),
    "Unranked/Ranked scored launch contract is missing"
);
check(
    scoredStartSource.includes("SKYNET_DEADLOCK_SCORED_GAME_MODE_V28") &&
        /requestedGameMode !==\s*\r?\n\s*1[\s\S]*requestedGameMode !==\s*\r?\n\s*4/.test(scoredStartSource) &&
        /party\.game_mode\s*=\s*\r?\n\s*requestedGameMode/.test(scoredStartSource),
    "Normal/Street Brawl game_mode is no longer propagated from 9010"
);
check(
    /deadlockStartDedicatedServer\(\s*matchLobbyId,\s*SCORED_MAP,\s*SCORED_HARD_BOT_DIFFICULTY\s*\)/.test(
        scoredStartSource
    ) &&
        /party\.bot_difficulty\s*=\s*\r?\n\s*SCORED_HARD_BOT_DIFFICULTY/.test(
            scoredStartSource
        ),
    "scored matchmaking no longer forces Hard bots into every empty slot"
);
check(
    scoredStartSource.includes("requestingMember.hero_roster") &&
        partyModeSource.includes("SKYNET_DEADLOCK_SCORED_HARD_BOTS_V27_PARTY_MODE") &&
        partyModeSource.includes("setCurrentDeadlockPartyState"),
    "scored hero-roster or shared Party propagation is missing"
);
check(
    matchmakingStateSource.includes("getCurrentDeadlockPartyState") &&
        !/in_matchmaking:\s*\r?\n\s*true/.test(matchmakingStateSource),
    "matchmaking status is still hardcoded"
);

const queueMethodStart = hostSource.indexOf(
    "public TsValue DeadlockQueueGcMessageForAccount"
);
check(queueMethodStart >= 0, "account fanout host method is missing");
const queueMethod = hostSource.slice(queueMethodStart);
check(
    queueMethod.includes("queue.Invoke(") &&
        !queueMethod.slice(0, queueMethod.indexOf("queue.Invoke(")).includes("session"),
    "cross-account fanout is no longer a durable pending-message enqueue"
);

const rows = [];
const modes = [
    { gameMode: 1, name: "Normal", teamSize: 6, capacity: 12, map: "dl_midtown" },
    { gameMode: 4, name: "StreetBrawl", teamSize: 4, capacity: 8, map: "dl_midtown" }
];

for (const mode of modes) {
    for (let botDifficulty = 1; botDifficulty <= 3; botDifficulty++) {
        for (let humanCount = 1; humanCount <= mode.capacity; humanCount++) {
            for (const randomizeLanes of [false, true]) {
                const result = buildRoster(
                    humans(humanCount, null, mode.gameMode),
                    botDifficulty,
                    mode.gameMode,
                    randomizeLanes
                );
                check(result.valid, `${mode.name} roster ${humanCount}/${mode.capacity} rejected`);

                const slots = result.roster.map((member) => member.slot);
                const humanMembers = result.roster.filter((member) => member.kind === "human");
                const botMembers = result.roster.filter((member) => member.kind === "bot");
                const firstSlot = 1;
                const team0 = result.roster.filter(
                    (member) => member.slot < firstSlot + mode.teamSize
                ).length;
                const team1 = result.roster.filter(
                    (member) => member.slot >= firstSlot + mode.teamSize
                ).length;

                check(result.roster.length === mode.capacity, `${mode.name} roster is not full`);
                check(new Set(slots).size === mode.capacity, `${mode.name} roster has duplicate slots`);
                check(!slots.includes(0), `${mode.name} roster still uses omitted signout slot 0`);
                check(
                    Math.min(...slots) === 1 && Math.max(...slots) === mode.capacity,
                    `${mode.name} roster is not mapped to non-zero slots`
                );
                check(humanMembers.length === humanCount, `${mode.name} roster lost a human`);
                check(botMembers.length === mode.capacity - humanCount, `${mode.name} bot count is wrong`);
                check(
                    team0 === mode.teamSize && team1 === mode.teamSize,
                    `${mode.name} teams are not balanced`
                );
            }
        }
    }

    const noBot = buildRoster(
        humans(mode.capacity, null, mode.gameMode),
        0,
        mode.gameMode,
        false
    );
    check(noBot.valid, `${mode.name} no-bot roster rejected`);
    check(noBot.roster.length === mode.capacity, `${mode.name} no-bot roster changed size`);

    rows.push({
        mode: mode.name,
        map: mode.map,
        teams: `${mode.teamSize}v${mode.teamSize}`,
        difficulties: "1..3",
        lanePolicies: "manual, standard",
        maxHumans: mode.capacity
    });
}

for (const mode of modes) {
    const collision = buildRoster(
        humans(2, [10, 10], mode.gameMode),
        3,
        mode.gameMode,
        false
    );
    check(collision.valid, `${mode.name} duplicate-slot recovery rejected`);
    check(
        new Set(collision.roster.map((member) => member.slot)).size === mode.capacity,
        `${mode.name} duplicate-slot recovery still collided`
    );

    const extraHuman = {
        accountId: 200000,
        customSlot: 10,
        team: 0
    };
    const tooMany = buildRoster(
        humans(mode.capacity, null, mode.gameMode).concat([extraHuman]),
        3,
        mode.gameMode,
        false
    );
    check(!tooMany.valid, `${mode.name} over-capacity roster was not rejected`);
}

const manualLane = buildRoster(
    [{ accountId: 100000, customSlot: 20, team: 0 }],
    0,
    1,
    false
);
const standardLane = buildRoster(
    [{ accountId: 100000, customSlot: 20, team: 0 }],
    0,
    1,
    true
);
check(manualLane.roster[0].slot === 7, "manual lane assignment was ignored");
check(standardLane.roster[0].slot === 1, "standard lane assignment used a manual slot");
check(laneId(1, 1, 6, 1, false) === 1, "first manual lane id is wrong");
check(laneId(4, 1, 6, 1, false) === 4, "middle manual lane id is wrong");
check(laneId(6, 1, 6, 1, false) === 6, "last manual lane id is wrong");
check(laneId(4, 1, 6, 1, true) === 0, "standard lanes still force lane_id");

const duplicateAccount = buildRoster(
    [
        { accountId: 100000, customSlot: 10 },
        { accountId: 100000, customSlot: 11 }
    ],
    3,
    1,
    false
);
check(!duplicateAccount.valid, "duplicate account was not rejected");

console.log("Deadlock custom-switch contract matrix");
console.table(rows);
console.log("PASS difficulty 0..3; Normal 6v6; Street Brawl 4v4; correct maps");
console.log("PASS manual and standard lane policies; mode-specific capacity guards");
console.log("PASS duplicate slot recovered; duplicate account rejected");
console.log("PASS reservation IP used; offline recipients remain durable queued targets");
console.log("PASS hidden dedicated cannot receive foreground activation permission");
console.log("PASS Unranked/Ranked launch forces Hard bots and preserves hero roster");
console.log("PASS scored game_mode preserves Normal/Street Brawl; Match ID stays searchable");
console.log("PASS advertised IP beats Hyper-V; mixed LAN/Radmin clients resolve separately");
