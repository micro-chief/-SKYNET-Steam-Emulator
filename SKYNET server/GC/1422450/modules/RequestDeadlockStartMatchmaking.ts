import {
    EGCCitadelClientMessages,
    CMsgClientToGCStartMatchmakingResponseEResultCode
} from "../generated/protobuf";

import {
    encodeProto,
    HandlerContext,
    Route
} from "../framework/gc";

import {
    getCurrentDeadlockPartyState,
    setCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

import {
    beginDeadlockMatchLobby,
    clearDeadlockMatchLobby,
    getCurrentDeadlockMatchLobbyId
} from "./DeadlockMatchLobbyState";

import {
    armDeadlockMatchFound,
    cancelDeadlockMatchFound
} from "./DeadlockMatchFound";

// SKYNET_DEADLOCK_SCORED_HARD_BOTS_V27
const SCORED_HARD_BOT_DIFFICULTY =
    3;

const SCORED_MAP =
    "dl_midtown";

const PARTY_SO_TYPE_ID =
    105;

export const RequestDeadlockStartMatchmakingRoute: Route = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartMatchmaking,

    request: {
        name:
            "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartMatchmaking"
    },

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCStartMatchmakingResponse,

    response: {
        name:
            "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartMatchmakingResponse"
    }
};

export const requestDeadlockStartMatchmaking = (
    ctx: HandlerContext
): void => {
    const request =
        ctx.request;

    const clientVersion =
        request.client_version ??
        0;

    const clientPlatform =
        request.client_platform ??
        0;

    const matchInfo =
        request.match_info;

    // === SKYNET_9010_MATCHMAKING_TRACE_V2_BEGIN ===

    log(
        "[9010] ========================================"
    );

    log(
        "[9010] client_version=" +
        clientVersion
    );

    log(
        "[9010] client_platform=" +
        clientPlatform
    );

    log(
        "[9010] pgi_verified=" +
        (
            request.pgi_verified ??
            false
        )
    );

    if (
        matchInfo
    ) {
        log(
            "[9010] match_info.present=true"
        );

        log(
            "[9010] match_mode=" +
            (
                matchInfo.match_mode ??
                0
            )
        );

        log(
            "[9010] game_mode=" +
            (
                matchInfo.game_mode ??
                0
            )
        );

        log(
            "[9010] bot_difficulty=" +
            (
                matchInfo.bot_difficulty ??
                0
            )
        );

        log(
            "[9010] region_mode=" +
            (
                matchInfo.region_mode ??
                0
            )
        );

        log(
            "[9010] mm_preference=" +
            (
                matchInfo.mm_preference ??
                0
            )
        );

        log(
            "[9010] prefer_solo_only=" +
            (
                matchInfo.prefer_solo_only ??
                false
            )
        );

        log(
            "[9010] server_search_key='" +
            (
                matchInfo.server_search_key ??
                ""
            ) +
            "'"
        );

        log(
            "[9010] server_command_string='" +
            (
                matchInfo.server_command_string ??
                ""
            ) +
            "'"
        );
    }
    else {
        log(
            "[9010] match_info.present=false"
        );
    }

    // === SKYNET_9010_MATCHMAKING_TRACE_V2_END ===

    const pingTimes =
        request.ping_times;

    const heroes =
        request.heroes;

    const pgiVerified =
        request.pgi_verified ??
        false;

    void clientVersion;
    void clientPlatform;
    void pingTimes;
    void pgiVerified;

    // SKYNET_DEADLOCK_SCORED_HARD_BOTS_V27
    // Local scored matchmaking supports Normal Unranked(1) and Ranked(4).
    // Empty roster positions are always filled by the already proven static
    // bot-member path at the maximum client-supported difficulty, Hard(3).
    const requestedMatchMode =
        matchInfo?.match_mode ??
        1;

    // SKYNET_DEADLOCK_SCORED_GAME_MODE_V28
    // match_mode selects Unranked/Ranked while game_mode independently
    // selects Normal(1) or Street Brawl(4).
    const requestedGameMode =
        matchInfo?.game_mode ??
        1;

    if (
        requestedMatchMode !==
            1 &&
        requestedMatchMode !==
            4
    ) {
        log(
            "[9010-SCORED] rejected match_mode=" +
            requestedMatchMode
        );

        ctx.reply({
            result:
                CMsgClientToGCStartMatchmakingResponseEResultCode
                    .k_EResult_ModeLocked,

            debug_message:
                "Local scored matchmaking supports Unranked and Ranked"
        });

        return;
    }

    if (
        requestedGameMode !==
            1 &&
        requestedGameMode !==
            4
    ) {
        log(
            "[9010-SCORED] rejected game_mode=" +
            requestedGameMode
        );

        ctx.reply({
            result:
                CMsgClientToGCStartMatchmakingResponseEResultCode
                    .k_EResult_ModeLocked,

            debug_message:
                "Local scored matchmaking supports Normal and Street Brawl"
        });

        return;
    }

    if (
        getCurrentDeadlockMatchLobbyId() !==
        0n
    ) {
        log("[9010-SCORED] rejected: match already active");

        ctx.reply({
            result:
                CMsgClientToGCStartMatchmakingResponseEResultCode
                    .k_EResult_AlreadyFindingMatch
        });

        return;
    }

    let party: any =
        getCurrentDeadlockPartyState();

    if (!party) {
        party = {
            party_id:
                ctx.steamId +
                1422450n,

            members:
                [],

            invites:
                [],

            left_members:
                [],

            join_code:
                ctx.steamId +
                1422450n
        };
    }

    if (
        !Array.isArray(
            party.members
        )
    ) {
        party.members =
            [];
    }

    let requestingMember: any =
        null;

    let memberIndex =
        0;

    while (
        memberIndex <
        party.members.length
    ) {
        if (
            party.members[memberIndex].account_id ===
            ctx.accountId
        ) {
            requestingMember =
                party.members[memberIndex];
            break;
        }

        memberIndex++;
    }

    if (!requestingMember) {
        requestingMember = {
            account_id:
                ctx.accountId,

            rights_flags:
                3,

            player_type:
                0,

            compatibility_version:
                1,

            platform:
                0,

            team:
                0,

            permissions:
                3n,

            new_player_progress:
                30n,

            owned_heroes:
                [],

            low_priority_games_remaining:
                0
        };

        party.members.push(
            requestingMember
        );
    }

    requestingMember.is_ready =
        false;

    if (heroes) {
        requestingMember.hero_roster =
            heroes;
    }

    const matchmakingStartTime =
        now();

    party.match_making_start_time =
        matchmakingStartTime;

    party.bot_difficulty =
        SCORED_HARD_BOT_DIFFICULTY;

    party.match_mode =
        requestedMatchMode;

    party.game_mode =
        requestedGameMode;

    party.region_mode =
        matchInfo?.region_mode ??
        party.region_mode ??
        1;

    party.mm_preference =
        matchInfo?.mm_preference ??
        0;

    party.server_search_key =
        matchInfo?.server_search_key ??
        "";

    party.is_private_lobby =
        false;

    party.private_lobby_settings =
        undefined;

    setCurrentDeadlockPartyState(
        party
    );

    const matchLobbyId =
        beginDeadlockMatchLobby(
            party.party_id
        );

    if (
        matchLobbyId ===
        0n
    ) {
        party.match_making_start_time =
            undefined;

        log("[9010-SCORED] lobby allocation failed");

        ctx.reply({
            result:
                CMsgClientToGCStartMatchmakingResponseEResultCode
                    .k_EResult_InternalError
        });

        return;
    }

    const dedicatedLaunch: any =
        deadlockStartDedicatedServer(
            matchLobbyId,
            SCORED_MAP,
            SCORED_HARD_BOT_DIFFICULTY
        );

    if (
        dedicatedLaunch == null ||
        dedicatedLaunch.started !=
            true
    ) {
        party.match_making_start_time =
            undefined;

        clearDeadlockMatchLobby(
            matchLobbyId
        );

        cancelDeadlockMatchFound(
            party.party_id
        );

        log("[9010-SCORED] dedicated launch failed");

        ctx.reply({
            result:
                CMsgClientToGCStartMatchmakingResponseEResultCode
                    .k_EResult_InternalError
        });

        return;
    }

    armDeadlockMatchFound(
        party.party_id,
        matchmakingStartTime
    );

    const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        {
            objects_modified: [
                {
                    type_id:
                        PARTY_SO_TYPE_ID,

                    object_data:
                        partyBytes
                }
            ],

            owner_soid: {
                type:
                    2,

                id:
                    party.party_id
            },

            service_id:
                1,

            version:
                party.party_id +
                2000n
        }
    );

    ctx.reply({
        result:
            CMsgClientToGCStartMatchmakingResponseEResultCode
                .k_EResult_OK,

        time_stamp:
            matchmakingStartTime
    });

    log(
        "[9010-SCORED] match_mode=" +
        requestedMatchMode +
        " game_mode=" +
        requestedGameMode +
        " bot_difficulty=3 lobby_id=" +
        matchLobbyId
    );

    log(
        "[9010-SCORED] dedicated port=" +
        dedicatedLaunch.port +
        " sequence=9010->26(Party)->9011->10023"
    );
};

export const createRequestDeadlockStartMatchmakingHandler =
    () => requestDeadlockStartMatchmaking;

export default requestDeadlockStartMatchmaking;
