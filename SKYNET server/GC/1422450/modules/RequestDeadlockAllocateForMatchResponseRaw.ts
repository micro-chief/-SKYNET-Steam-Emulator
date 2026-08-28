// SKYNET_DEADLOCK_CLIENT_ASSIGN_AFTER_READY_V1_ARM
import {
    armDeadlockClientAssignmentAfterReady
} from "./DeadlockClientAssignment";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

// SKYNET_DEADLOCK_EPHEMERAL_MATCH_LOBBY_V1_10022
import {
    getCurrentDeadlockMatchId,
    getCurrentDeadlockMatchLobbyId
} from "./DeadlockMatchLobbyState";
import {
    Route
} from "../framework/gc";


// === SKYNET_SERVER_STATIC_LOBBY_102_V11_BEGIN ===

const SKYNET_SERVER_STATIC_LOBBY_SO_TYPE =
    102;

function sky102Number(
    value: any,
    fallback: number
): number {
    if (
        typeof value === "number"
    ) {
        return value;
    }

    if (
        typeof value === "bigint"
    ) {
        return Number(value);
    }

    if (
        typeof value === "string"
    ) {
        const parsed =
            Number(value);

        if (
            parsed == parsed
        ) {
            return parsed;
        }
    }

    return fallback;
}

function sky102BigInt(
    value: any
): bigint {
    if (
        typeof value === "bigint"
    ) {
        return value;
    }

    if (
        typeof value === "number"
    ) {
        return BigInt(value);
    }

    if (
        typeof value === "string"
    ) {
        return BigInt(value);
    }

    return 0n;
}

function sky102Varint(
    output: number[],
    value: bigint
): void {
    let current =
        value;

    while (
        current >= 128n
    ) {
        output.push(
            Number(
                current &
                127n
            ) |
            128
        );

        current =
            current >>
            7n;
    }

    output.push(
        Number(current)
    );
}

function sky102VarintNumber(
    output: number[],
    value: number
): void {
    let current =
        Math.floor(
            value
        );

    if (
        current <
        0
    ) {
        throw new Error(
            "[102-GS] negative number varint"
        );
    }

    while (
        current >=
        128
    ) {
        output.push(
            (
                current %
                128
            ) +
            128
        );

        current =
            Math.floor(
                current /
                128
            );
    }

    output.push(
        current
    );
}

function sky102Key(
    output: number[],
    field: number,
    wire: number
): void {
    sky102VarintNumber(
        output,
        field * 8 +
        wire
    );
}

function sky102UInt(
    output: number[],
    field: number,
    value: number
): void {
    sky102Key(
        output,
        field,
        0
    );

    sky102VarintNumber(
        output,
        value
    );
}

function sky102UInt64(
    output: number[],
    field: number,
    value: bigint
): void {
    sky102Key(
        output,
        field,
        0
    );

    sky102Varint(
        output,
        value
    );
}

function sky102Fixed64(
    output: number[],
    field: number,
    value: bigint
): void {
    sky102Key(
        output,
        field,
        1
    );

    let current =
        value;

    let index =
        0;

    while (
        index <
        8
    ) {
        output.push(
            Number(
                current &
                255n
            )
        );

        current =
            current >>
            8n;

        index++;
    }
}

function sky102Bytes(
    output: number[],
    field: number,
    bytes: number[]
): void {
    sky102Key(
        output,
        field,
        2
    );

    sky102VarintNumber(
        output,
        bytes.length
    );

    let index =
        0;

    while (
        index <
        bytes.length
    ) {
        output.push(
            bytes[index]
        );

        index++;
    }
}

function sky102String(
    output: number[],
    field: number,
    value: string
): void {
    const bytes: number[] =
        [];

    let index =
        0;

    while (
        index <
        value.length
    ) {
        const code =
            value.charCodeAt(
                index
            );

        /*
         * dl_midtown / persona names used by this probe
         * are ASCII.
         */
        if (
            code <=
            127
        ) {
            bytes.push(
                code
            );
        }

        index++;
    }

    sky102Bytes(
        output,
        field,
        bytes
    );
}

function sky102FindSlot(
    party: any,
    accountId: number
): number {
    const settings =
        party.private_lobby_settings ??
        party.privateLobbySettings;

    if (!settings) {
        return -1;
    }

    // SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19
    // Standard lane distribution deliberately ignores the manual match-slot
    // table. Manual mode keeps the exact user-to-slot assignments below.
    const randomizeLanes =
        settings.randomize_lanes ??
        settings.randomizeLanes ??
        false;

    if (
        randomizeLanes === true
    ) {
        return -1;
    }

    const slots =
        settings.match_slots ??
        settings.matchSlots ??
        [];

    let index =
        0;

    while (
        index <
        slots.length
    ) {
        const slot =
            slots[index];

        const slotAccountId =
            sky102Number(
                slot.player_account_id ??
                slot.playerAccountId ??
                slot.account_id ??
                slot.accountId,
                0
            );

        if (
            slotAccountId ===
            accountId
        ) {
            return sky102Number(
                slot.slot_id ??
                slot.slotId,
                -1
            );
        }

        index++;
    }

    return -1;
}

function sky102PlayerSlot(
    customSlot: number,
    fallback: number,
    gameMode: number
): number {
    /*
     * Current Custom Lobby layout:
     *
     * Team0 UI slots 10..15 -> server slots 1..6
     * Team1 UI slots 20..25 -> server slots 7..12
     *
     * Keep both values in diagnostics.
     */
    if (
        gameMode === 4
    ) {
        if (
            customSlot >= 10 &&
            customSlot <= 13
        ) {
            return customSlot - 9;
        }

        if (
            customSlot >= 20 &&
            customSlot <= 23
        ) {
            return 5 +
                customSlot -
                20;
        }

        if (
            customSlot >= 0 &&
            customSlot <= 7
        ) {
            return customSlot + 1;
        }
    }
    else {
        if (
            customSlot >= 10 &&
            customSlot <= 15
        ) {
            return customSlot - 9;
        }

        if (
            customSlot >= 20 &&
            customSlot <= 25
        ) {
            return 7 +
                customSlot -
                20;
        }

        if (
            customSlot >= 0 &&
            customSlot <= 11
        ) {
            return customSlot + 1;
        }
    }

    return fallback;
}

// SKYNET_DEADLOCK_MANUAL_LANE_ID_V25
// The private-lobby UI exposes two positions on each of Midtown's three
// lanes. player_slot is only the participant index; Member.lane_id (field 10)
// is the server's actual pre-game zipline assignment.
function sky102LaneId(
    playerSlot: number,
    firstRosterSlot: number,
    teamSize: number,
    gameMode: number,
    randomizeLanes: boolean
): number {
    if (
        randomizeLanes ||
        gameMode !== 1 ||
        teamSize !== 6
    ) {
        return 0;
    }

    const teamSlot =
        (
            playerSlot -
            firstRosterSlot
        ) %
        teamSize;

    if (
        teamSlot === 0 ||
        teamSlot === 1
    ) {
        return 1;
    }

    if (
        teamSlot === 2 ||
        teamSlot === 3
    ) {
        return 4;
    }

    if (
        teamSlot === 4 ||
        teamSlot === 5
    ) {
        return 6;
    }

    return 0;
}

function sky102Team(
    member: any,
    customSlot: number
): number {
    const direct =
        sky102Number(
            member.team,
            -1
        );

    if (
        direct === 0 ||
        direct === 1
    ) {
        return direct;
    }

    if (
        customSlot >= 20 &&
        customSlot <= 25
    ) {
        return 1;
    }

    return 0;
}

function sky102Hero(
    member: any
): any {
    const direct =
        sky102Number(
            member.hero_id ??
            member.heroId ??
            member.selected_hero_id ??
            member.selectedHeroId,
            0
        );

    if (
        direct >
        0
    ) {
        return {
            hero_id:
                direct,

            source:
                "member-direct",

            candidates:
                ""
        };
    }

    const roster =
        member.hero_roster ??
        member.heroRoster;

    if (!roster) {
        return {
            hero_id:
                0,

            source:
                "none",

            candidates:
                ""
        };
    }

    const selections =
        roster.hero_selections ??
        roster.heroSelections ??
        [];

    if (
        !Array.isArray(
            selections
        )
    ) {
        return {
            hero_id:
                0,

            source:
                "hero_roster-not-array",

            candidates:
                ""
        };
    }

    let selectedHero =
        0;

    let selectedPriority =
        2147483647;

    let candidates =
        "";

    let index =
        0;

    while (
        index <
        selections.length
    ) {
        const selection =
            selections[index];

        const heroId =
            sky102Number(
                selection.hero_id ??
                selection.heroId,
                0
            );

        const priority =
            sky102Number(
                selection.priority,
                0
            );

        if (
            heroId >
            0
        ) {
            if (
                candidates.length >
                0
            ) {
                candidates +=
                    ",";
            }

            candidates +=
                heroId +
                ":p" +
                priority;

            /*
             * Priority 1 is preferred over 2/3.
             * Missing/zero priority comes last.
             */
            const normalizedPriority =
                priority >
                0
                    ? priority
                    : 2147483647;

            if (
                selectedHero === 0 ||
                normalizedPriority <
                selectedPriority
            ) {
                selectedHero =
                    heroId;

                selectedPriority =
                    normalizedPriority;
            }
        }

        index++;
    }

    return {
        hero_id:
            selectedHero,

        source:
            "hero_roster",

        candidates:
            candidates
    };
}

// SKYNET_DEADLOCK_CONDITIONAL_BOTS_V14_STATIC_BOT_MEMBERS
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

// SKYNET_DEADLOCK_MULTIPLAYER_ROSTER_GUARD_V18
// Resolve collisions deterministically. Valid custom-lobby slots are kept;
// missing or duplicated slots receive the first free server slot.
function sky102OpenPlayerSlot(
    occupiedSlots: number[],
    preferredSlot: number,
    firstSlot: number,
    slotEnd: number
): number {
    if (
        preferredSlot >= firstSlot &&
        preferredSlot < slotEnd &&
        !sky102ContainsNumber(
            occupiedSlots,
            preferredSlot
        )
    ) {
        return preferredSlot;
    }

    let candidate =
        firstSlot;

    while (
        candidate < slotEnd
    ) {
        if (
            !sky102ContainsNumber(
                occupiedSlots,
                candidate
            )
        ) {
            return candidate;
        }

        candidate++;
    }

    return -1;
}

function sky102StandardPlayerSlot(
    member: any,
    occupiedSlots: number[],
    teamSize: number,
    firstSlot: number
): number {
    const memberTeam =
        sky102Team(
            member,
            -1
        );

    const start =
        memberTeam === 1
            ? firstSlot + teamSize
            : firstSlot;

    const end =
        start +
        teamSize;

    let candidate =
        start;

    while (
        candidate < end
    ) {
        if (
            !sky102ContainsNumber(
                occupiedSlots,
                candidate
            )
        ) {
            return candidate;
        }

        candidate++;
    }

    return start;
}

function sky102ChooseBotHero(
    usedHeroes: number[],
    sequence: number
): number {
    // SKYNET_DEADLOCK_CONDITIONAL_BOTS_V15_VALIDATED_HERO_POOL
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
    botIndex: number,
    team: number,
    laneId: number
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
        team
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

    if (
        laneId >
        0
    ) {
        sky102UInt(
            output,
            10,
            laneId
        );
    }

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
        " lane_id=" +
        laneId +
        " difficulty=" +
        botDifficulty
    );

    return output;
}

function sky102EncodeMember(
    member: any,
    party: any,
    rosterIndex: number,
    playerSlot: number,
    team: number,
    laneId: number
): number[] {
    const output: number[] =
        [];

    const accountId =
        sky102Number(
            member.account_id ??
            member.accountId,
            0
        );

    const customSlot =
        sky102FindSlot(
            party,
            accountId
        );

    const hero =
        sky102Hero(
            member
        );

    log(
        "[102-GS] member[" +
        rosterIndex +
        "] account_id=" +
        accountId
    );

    log(
        "[102-GS] member[" +
        rosterIndex +
        "] custom_slot=" +
        customSlot +
        " -> player_slot=" +
        playerSlot
    );

    log(
        "[102-GS] member[" +
        rosterIndex +
        "] team=" +
        team
    );

    log(
        "[102-GS] member[" +
        rosterIndex +
        "] lane_id=" +
        laneId
    );

    log(
        "[102-GS] member[" +
        rosterIndex +
        "] hero_id=" +
        hero.hero_id +
        " source=" +
        hero.source
    );

    if (
        hero.candidates.length >
        0
    ) {
        log(
            "[102-GS] member[" +
            rosterIndex +
            "] hero_candidates=" +
            hero.candidates
        );
    }

    /*
     * CSOCitadelServerStaticLobby.Member:
     *
     * 1 account_id
     * 2 persona_name
     * 3 team
     * 4 player_slot
     * 5 hero_id
     * 6 party_index
     * 7 platform
     * 10 lane_id
     */

    sky102UInt(
        output,
        1,
        accountId
    );

    const persona =
        member.persona_name ??
        member.personaName ??
        "";

    if (
        persona.length >
        0
    ) {
        sky102String(
            output,
            2,
            persona
        );
    }

    sky102UInt(
        output,
        3,
        team
    );

    sky102UInt(
        output,
        4,
        playerSlot
    );

    if (
        hero.hero_id >
        0
    ) {
        sky102UInt(
            output,
            5,
            hero.hero_id
        );
    }

    sky102UInt(
        output,
        6,
        sky102Number(
            member.party_index ??
            member.partyIndex,
            0
        )
    );

    if (
        laneId >
        0
    ) {
        sky102UInt(
            output,
            10,
            laneId
        );
    }

    const platform =
        sky102Number(
            member.platform,
            0
        );

    if (
        platform >
        0
    ) {
        sky102UInt(
            output,
            7,
            platform
        );
    }

    return output;
}




// === SKYNET_SERVER_COMMON_AND_STATIC_LOBBY_V163_BEGIN ===

/*
 * Dedicated reservation completion probe.
 *
 * Proven working:
 *
 *   10021 AllocateForMatch
 *   10022 success
 *   24 EMPTY
 *   24 FULL type102
 *
 * type102 applies:
 *
 *   player
 *   slot
 *   team
 *   hero
 *
 * But reservation watchdog later reports:
 *
 *   Failed to receive match after server received message
 *   to reserve for match ...
 *
 * type102 does not carry match_id.
 *
 * V1.6.3 keeps the proven TWO-PHASE lifecycle and changes
 * only the FULL snapshot:
 *
 *   [ type101 CSOCitadelLobby,
 *     type102 CSOCitadelServerStaticLobby ]
 */

const SKYNET_SERVER_COMMON_LOBBY_SO_TYPE =
    101;

function sky101EncodeServerCommonLobby(
    party: any,
    lobbyId: bigint,
    matchId: bigint,
    serverSteamId: bigint,
    serverPort: number
): number[] {
    const output: number[] =
        [];

    const matchMode =
        sky102Number(
            party.match_mode ??
            party.matchMode,
            2
        );

    const gameMode =
        sky102Number(
            party.game_mode ??
            party.gameMode,
            1
        );

    /*
     * CSOCitadelLobby:
     *
     *  1 uint64  lobby_id
     *  2 uint64  match_id
     *  3 enum    match_mode
     *  4 enum    game_mode
     *  5 uint32  compatibility_version
     *  7 fixed64 server_steam_id
     *  8 enum    server_state
     * 10 uint32  udp_connect_port
     * 13 uint32  server_version
     */

    sky102UInt64(
        output,
        1,
        lobbyId
    );

    /*
     * Separate ID already sent to this dedicated through 10021.
     */
    sky102UInt64(
        output,
        2,
        matchId
    );

    sky102UInt(
        output,
        3,
        matchMode
    );

    sky102UInt(
        output,
        4,
        gameMode
    );

    sky102UInt(
        output,
        5,
        6677
    );

    sky102Fixed64(
        output,
        7,
        serverSteamId
    );

    /*
     * Assign.
     */
    sky102UInt(
        output,
        8,
        0
    );

    sky102UInt(
        output,
        10,
        serverPort
    );

    sky102UInt(
        output,
        13,
        6677
    );

    log(
        "[101-GS] ========================================"
    );

    log(
        "[101-GS] build CSOCitadelLobby type_id=101"
    );

    log(
        "[101-GS] lobby_id=" +
        lobbyId
    );

    log(
        "[101-GS] match_id=" +
        matchId
    );

    log(
        "[101-GS] match_mode=" +
        matchMode
    );

    log(
        "[101-GS] game_mode=" +
        gameMode
    );

    log(
        "[101-GS] server_steam_id=" +
        serverSteamId
    );

    log(
        "[101-GS] server_state=0"
    );

    log(
        "[101-GS] bytes=" +
        output.length
    );

    return output;
}

// === SKYNET_SERVER_COMMON_AND_STATIC_LOBBY_V163_END ===

function sky102Publish(ctx: any): number {
    log(
        "[102-GS] ========================================"
    );

    log(
        "[102-GS] build CSOCitadelServerStaticLobby type_id=102"
    );

    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
        log(
            "[102-GS] ABORT no current party"
        );

        return 0;
    }

    const lobbyId =
        getCurrentDeadlockMatchLobbyId();

    const matchId =
        getCurrentDeadlockMatchId();

    const serverSteamId =
        sky102BigInt(
            ctx.steamId
        );

    if (
        lobbyId ===
            0n ||
        matchId ===
            0n
    ) {
        log(
            "[102-GS] ABORT lobby_id or match_id is zero"
        );

        return 0;
    }

    const reservation: any =
        deadlockDedicatedServerState(
            lobbyId
        );

    if (
        reservation == null ||
        reservation.found != true ||
        reservation.gameServerSteamId !==
            serverSteamId ||
        reservation.port <=
            0
    ) {
        log(
            "[102-GS] ABORT reservation mismatch lobby_id=" +
            lobbyId +
            " server_steam_id=" +
            serverSteamId
        );
        return 0;
    }

    const serverPort =
        reservation.port;

    const partyMembers =
        party.members ??
        [];

    const botDifficulty =
        sky102Number(
            party.bot_difficulty ??
            party.botDifficulty,
            0
        );

    // SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19
    // ECitadelGameMode 1 = Normal (6v6), 4 = StreetBrawl (4v4).
    const requestedGameMode =
        sky102Number(
            party.game_mode ??
            party.gameMode,
            1
        );

    const gameMode =
        requestedGameMode === 4
            ? 4
            : 1;

    const teamSize =
        gameMode === 4
            ? 4
            : 6;

    const rosterCapacity =
        teamSize * 2;

    // SKYNET_DEADLOCK_NONZERO_SIGNOUT_SLOTS_V25
    // Live 10014 evidence from this dedicated build shows that logical slot 0
    // participates in the match but is consistently omitted from
    // match_data.players. Keep both complete rosters in the non-zero range:
    // Street Brawl uses 1..8 and Normal uses 1..12.
    const firstRosterSlot =
        1;

    const rosterSlotEnd =
        firstRosterSlot +
        rosterCapacity;

    // SKYNET_DEADLOCK_STREET_BRAWL_MIDTOWN_V20
    // game_mode=4 activates Brawl rules; both supported modes use Midtown.
    const levelName =
        "dl_midtown";

    const privateSettings =
        party.private_lobby_settings ??
        party.privateLobbySettings;

    const randomizeLanes =
        privateSettings != null &&
        (
            privateSettings.randomize_lanes ??
            privateSettings.randomizeLanes ??
            false
        ) === true;

    log(
        "[102-GS] game_mode=" +
        gameMode +
        " level=" +
        levelName +
        " capacity=" +
        rosterCapacity
    );

    if (randomizeLanes) {
        log("[102-GS] lanes=standard");
    }
    else {
        log("[102-GS] lanes=manual");
    }

    const encodedMembers: number[][] =
        [];

    const occupiedSlots: number[] =
        [];

    const usedHeroes: number[] =
        [];

    const seenAccounts: number[] =
        [];

    let invalidRoster =
        false;

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
            if (
                sky102ContainsNumber(
                    seenAccounts,
                    accountId
                )
            ) {
                log(
                    "[102-GS] ABORT duplicate account_id=" +
                    accountId
                );

                invalidRoster =
                    true;

                break;
            }

            seenAccounts.push(
                accountId
            );

            const customSlot =
                sky102FindSlot(
                    party,
                    accountId
                );

            let playerSlot =
                sky102PlayerSlot(
                    customSlot,
                    sky102StandardPlayerSlot(
                        member,
                        occupiedSlots,
                        teamSize,
                        firstRosterSlot
                    ),
                    gameMode
                );

            const preferredSlot =
                playerSlot;

            playerSlot =
                sky102OpenPlayerSlot(
                    occupiedSlots,
                    preferredSlot,
                    firstRosterSlot,
                    rosterSlotEnd
                );

            if (
                playerSlot <
                0
            ) {
                log(
                    "[102-GS] ABORT roster capacity exceeded account_id=" +
                    accountId
                );

                invalidRoster =
                    true;

                break;
            }

            if (
                playerSlot !==
                preferredSlot
            ) {
                log(
                    "[102-GS] slot collision account_id=" +
                    accountId +
                    " preferred=" +
                    preferredSlot +
                    " assigned=" +
                    playerSlot
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
                    playerSlot,
                    playerSlot <
                        firstRosterSlot +
                            teamSize
                            ? 0
                            : 1,
                    sky102LaneId(
                        playerSlot,
                        firstRosterSlot,
                        teamSize,
                        gameMode,
                        randomizeLanes
                    )
                )
            );
        }

        sourceIndex++;
    }

    if (invalidRoster) {
        return 0;
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
            firstRosterSlot;

        while (
            playerSlot <
            rosterSlotEnd
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
                        botCount,
                        playerSlot <
                            firstRosterSlot +
                                teamSize
                                ? 0
                                : 1,
                        sky102LaneId(
                            playerSlot,
                            firstRosterSlot,
                            teamSize,
                            gameMode,
                            randomizeLanes
                        )
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
    );

    const staticLobby: number[] =
        [];

    /*
     * CSOCitadelServerStaticLobby:
     *
     * 2 fixed64 server_steam_id
     * 3 uint64 lobby_id
     * 5 string level_name
     * 6 repeated Member
     * 8 bool gc_provided_heroes
     * 9 bot_difficulty
     * 16 region_mode
     * 21 cheats_enabled
     * 22 duplicate_heroes_enabled
     */

    sky102Fixed64(
        staticLobby,
        2,
        serverSteamId
    );

    sky102UInt64(
        staticLobby,
        3,
        lobbyId
    );

    sky102String(
        staticLobby,
        5,
        levelName
    );

    let memberIndex =
        0;

    while (
        memberIndex <
        encodedMembers.length
    ) {
        sky102Bytes(
            staticLobby,
            6,
            encodedMembers[
                memberIndex
            ]
        );

        memberIndex++;
    }

    // SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_ROLLBACK_HERO_V1
    // V1.3 was disproved live: omitting field 8 removed the selected hero
    // and did not create bots. Keep the proven hero assignment for all matches.
    sky102UInt(
        staticLobby,
        8,
        1
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
    }

    const regionMode =
        sky102Number(
            party.region_mode ??
            party.regionMode,
            0
        );

    if (
        regionMode >
        0
    ) {
        sky102UInt(
            staticLobby,
            16,
            regionMode
        );
    }

    const settings =
        party.private_lobby_settings ??
        party.privateLobbySettings;

    if (
        settings &&
        (
            settings.cheats_enabled === true ||
            settings.cheatsEnabled === true
        )
    ) {
        sky102UInt(
            staticLobby,
            21,
            1
        );
    }

    if (
        settings &&
        (
            settings.duplicate_heroes_enabled === true ||
            settings.duplicateHeroesEnabled === true
        )
    ) {
        sky102UInt(
            staticLobby,
            22,
            1
        );
    }

    log(
        "[102-GS] lobby_id=" +
        lobbyId
    );

    log(
        "[102-GS] server_steam_id=" +
        serverSteamId
    );

    log(
        "[102-GS] roster.count=" +
        encodedMembers.length
    );

    log(
        "[102-GS] static_lobby.bytes=" +
        staticLobby.length
    );

    /*
     * Match/lobby SO caches use owner type 3.
     */
    /*
     * V1.4:
     * common lobby is deliberately built immediately before
     * the shared CacheSubscribed snapshot.
     */



    // === SKYNET_SERVER_STATIC_LOBBY_102_TWO_PHASE_V152_BEGIN ===

    /*
     * V1.5.2
     *
     * Reproduce two-stage SO subscription:
     *
     *   phase 1:
     *     msg 24
     *     objects absent
     *     service_id absent
     *     service_list = [1]
     *
     *   phase 2:
     *     msg 24
     *     type_id = 102
     *     service_id = 1
     *     service_list = [0]
     *
     * Both use the same owner and sync_version.
     */

    const sky102SyncVersion =
        lobbyId +
        301n;

    const emptyCache = {
        version:
            lobbyId +
            299n,

        owner_soid: {
            type:
                3,

            id:
                lobbyId
        },

        service_list: [
            1
        ],

        sync_version:
            sky102SyncVersion
    };

    // === SKYNET_SERVER_STATIC_LOBBY_102_TWO_PHASE_V152_END ===

    const commonLobby =
        sky101EncodeServerCommonLobby(
            party,
            lobbyId,
            matchId,
            serverSteamId,
            serverPort
        );

    // SKYNET_SERVER_DYNAMIC_LOBBY_106_V181_BYTES
    const skyV181DynamicLobbySoType =
        106;

    const skyV181DynamicLobby: number[] =
        [];

    sky102UInt64(
        skyV181DynamicLobby,
        1,
        lobbyId
    );

    log(
        "[106-GS] build minimal CSOCitadelServerDynamicLobby type_id=" +
        skyV181DynamicLobbySoType
    );

    log(
        "[106-GS] lobby_id=" +
        lobbyId
    );

    log(
        "[106-GS] bytes=" +
        skyV181DynamicLobby.length
    );

    const cache = {
        objects: [
            {
                type_id:
                    SKYNET_SERVER_COMMON_LOBBY_SO_TYPE,

                object_data: [
                    commonLobby
                ]
            },

            {
                type_id:
                    SKYNET_SERVER_STATIC_LOBBY_SO_TYPE,

                object_data: [
                    staticLobby
                ]
            }
        ,
            {
                // SKYNET_SERVER_DYNAMIC_LOBBY_106_V181_OBJECT
                type_id:
                    skyV181DynamicLobbySoType,

                object_data: [
                    skyV181DynamicLobby
                ]
            }
        ],

        version:
            lobbyId +
            300n,

        owner_soid: {
            type:
                3,

            id:
                lobbyId
        },

        service_id:
            1,

        service_list: [
            0
        ],

        sync_version:
            sky102SyncVersion
    };


log(
        "[102-GS] phase2 build FULL CacheSubscribed"
    );

    log(
        "[102-GS] owner.type=3"
    );

    log(
        "[102-GS] owner.id=" +
        lobbyId
    );

    log(
        "[102-GS] type_id=102"
    );

    log(
        "[102-GS] gc_provided_heroes=true"
    );

    log(
        "[102-GS] phase1 send msg=24 EMPTY CacheSubscribed"
    );

    log(
        "[102-GS] phase1 owner.type=3"
    );

    log(
        "[102-GS] phase1 owner.id=" +
        lobbyId
    );

    log(
        "[102-GS] phase1 service_id=ABSENT"
    );

    log(
        "[102-GS] phase1 service_list[0]=1"
    );

    ctx.send(
        24,
        "CMsgSOCacheSubscribed",
        emptyCache
    );

    log(
        "[102-GS] phase1 EMPTY sent"
    );

    log(
        "[101+102-GS] phase2 FULL objects.count=2"
    );

    log(
        "[101+102-GS] objects[0].type_id=101"
    );

    log(
        "[101+102-GS] objects[0].bytes=" +
        commonLobby.length
    );

    log(
        "[101+102-GS] objects[1].type_id=102"
    );

    log(
        "[101+102-GS] objects[1].bytes=" +
        staticLobby.length
    );

    log(
        "[102-GS] phase2 send msg=24 FULL type101+type102"
    );

        // SKYNET_SERVER_DYNAMIC_LOBBY_106_V181_DIAG
        log(
            "[106-GS] FULL server cache objects=101,102,106"
        );

        log(
            "[106-GS] fullCache variable=cache"
        );

    log(
        "[102-GS] phase2 type_id=102"
    );

    log(
        "[102-GS] phase2 service_id=1"
    );

    log(
        "[102-GS] phase2 service_list[0]=0"
    );

    ctx.send(
        24,
        "CMsgSOCacheSubscribed",
        cache
    );

    log(
        "[102-GS] sequence=10022(success)->24(empty)->24(type101+type102)"
    );

    log(
        "[102-GS] actual_port=" +
        serverPort
    );

    return serverPort;
}

// === SKYNET_SERVER_STATIC_LOBBY_102_V11_END ===

export const RequestDeadlockAllocateForMatchResponseRawRoute: Route = {
    requestId:
        10022,

    request: {
        name:
            "CMsgClientHello"
    },

    responseId:
        10022,

    response: {
        name:
            "CMsgClientWelcome"
    }
};

export function requestDeadlockAllocateForMatchResponseRaw(
    ctx: any
): boolean {
    const successValue =
        ctx.request.version ?? 0;

    log(
        "[10022-GS] ========================================"
    );

    log(
        "[10022-GS] steamId=" +
        ctx.steamId
    );

    log(
        "[10022-GS] field1=" +
        successValue
    );

    if (
        successValue != 0
    ) {
        log(
            "[10022-GS] success=true"
        );
    } else {
        log(
            "[10022-GS] success=false"
        );
    }

    log(
        "[10022-GS] AllocateForMatchResponse received"
    );

// === SKYNET_SERVER_STATIC_LOBBY_102_V11_CALL_BEGIN ===

    if (
        successValue != 0
    ) {
        const serverPort =
            sky102Publish(ctx);

        // SKYNET_DEADLOCK_CLIENT_ASSIGN_DIRECT_V111
        // Client fanout is intentionally delayed until the second
        // accepted 10025 InGame report, after Changelevel is active.
        log(
            "[CLIENT-ASSIGN-READY] 10022 success -> arm pending assignment"
        );

        const clientAssignmentArmed =
            serverPort >
                0 &&
            armDeadlockClientAssignmentAfterReady(
                ctx.steamId,
                serverPort
            );

        log(
            "[CLIENT-ASSIGN-READY] armed=" +
            clientAssignmentArmed
        );
    }
    else {
        log(
            "[102-GS] skip because successValue=0"
        );
    }

// === SKYNET_SERVER_STATIC_LOBBY_102_V11_CALL_END ===


    return true;
}
