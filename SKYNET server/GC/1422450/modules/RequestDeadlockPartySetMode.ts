import {
    encodeProto
} from "../framework/gc";

import {
    CMsgClientToGCPartySetMode,
    CMsgClientToGCPartySetModeResponse,
    CMsgClientToGCPartySetModeResponseEResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetMode"
} as ProtoDescriptor<CMsgClientToGCPartySetMode>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetModeResponse"
} as ProtoDescriptor<CMsgClientToGCPartySetModeResponse>;

export const RequestDeadlockPartySetModeRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCPartySetMode,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCPartySetModeResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCPartySetMode,
    CMsgClientToGCPartySetModeResponse
>;

export function requestDeadlockPartySetMode(
    ctx: any
): boolean {
    const request =
        ctx.request;

    const partyId =
        request.party_id ??
        (
            ctx.steamId +
            1422450n
        );

    /*
     * ECitadelMatchMode:
     *
     *   Invalid      = 0
     *   Unranked     = 1
     *   PrivateLobby = 2
     *   CoopBot      = 3
     *   Ranked       = 4
     *
     * We respect the mode sent by the client.
     *
     * For the custom/private-lobby flow, the expected value is 2.
     */
    const matchMode =
        request.match_mode ??
        2;

    /*
     * ECitadelGameMode:
     *
     *   Invalid = 0
     *   Normal  = 1
     *
     * Private lobby falls back to Normal if the client omitted it.
     */
    const gameMode =
        request.game_mode ??
        (
            matchMode === 2
                ? 1
                : 0
        );

    const botDifficulty =
        request.bot_difficulty ??
        0;

    const regionMode =
        request.region_mode ??
        1;

    const devServerCommand =
        request.dev_server_command ??
        "";

    const isPrivateLobby =
        matchMode === 2;

    /*
     * Rebuild the local single-user party snapshot.
     *
     * Until the persistent Party/DB state store is implemented,
     * the emulator has one local party owner and can reconstruct
     * the SO from the request + current HandlerContext.
     */
    const party: any = {
        party_id:
            partyId,

        members: [
            {
                account_id:
                    ctx.accountId,

                rights_flags:
                    3,

                /* SKYNET_BOT_MATCH_MEMBER_NOT_READY_V1 */
                /*
                 * Bot Match hero selection must remain editable while
                 * matchmaking is active.
                 *
                 * 9207 previously published this synthetic Party member
                 * as ready=true. Deadlock then locally treats hero
                 * selection as locked: the Change Hero button plays its
                 * sound but emits no GC message at all.
                 *
                 * Bot matchmaking itself is carried by 9010 and already
                 * contains match_info + heroes, so this Party member must
                 * not be pre-locked as ready.
                 */
                is_ready:
                    false,

                player_type:
                    0,

                compatibility_version:
                    1,

                platform:
                    0,

                team:
                    0,

                // SKYNET_RANKED_PARTY_SETMODE_SYNC_V1
                permissions:
                    3n /* SKYNET_RANKED_PERMISSION_BIT_PARTY_SETMODE_V3: previous=2, Ranked=1, combined=3 */,

                new_player_progress:
                    30n,

                owned_heroes:
                    [],

                low_priority_games_remaining:
                    0,

                ranked_scores: [
                    {
                        rank_type:
                            1,

                        rank_interval:
                            1,

                        unlocked_heroes: [
                            14,
                            63,
                            64
                        ],

                        in_calibration:
                            true
                    }
                ]
            }
        ],

        invites:
            [],

        dev_server_command:
            devServerCommand,

        left_members:
            [],

        join_code:
            partyId,

        bot_difficulty:
            botDifficulty,

        match_mode:
            matchMode,

        game_mode:
            gameMode,

        server_search_key:
            "",

        chat_mode:
            1,

        region_mode:
            regionMode,

        is_private_lobby:
            isPrivateLobby,

        private_lobby_settings:
            isPrivateLobby
                ? {
                    min_roster_size:
                        1,

                    match_slots:
                        [],

                    randomize_lanes:
                        false,

                    server_region:
                        0,

                    is_publicly_visible:
                        false,

                    cheats_enabled:
                        false,

                    available_regions:
                        [],

                    duplicate_heroes_enabled:
                        true
                }
                : undefined,

        desires_laning_together:
            false,

        mm_preference:
            0,

        hideout_search_key:
            ""
    };

    const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    /*
     * 9208 must ACK the mode transition.
     *
     * time_stamp is optional and intentionally omitted because
     * TypeSharp does not expose Date.now().
     */
    ctx.reply({
        result:
            CMsgClientToGCPartySetModeResponseEResponse
                .k_eSuccess,

        account_id:
            ctx.accountId
    });

    /*
     * Refresh CSOCitadelParty after the successful mode transition.
     *
     * Existing PartyCreate uses:
     *
     *   SO owner type       = 2
     *   CSOCitadelParty id  = 105
     *
     * We deliberately use CMsgSOCacheSubscribed as the already proven
     * working transport for the local Deadlock GC.
     */
    ctx.send(
        24,
        "CMsgSOCacheSubscribed",
        {
            objects: [
                {
                    type_id:
                        105,

                    object_data: [
                        partyBytes
                    ]
                }
            ],

            version:
                3n,

            owner_soid: {
                type:
                    2,

                id:
                    partyId
            },

            service_id:
                0,

            service_list: [
                1
            ],

            sync_version:
                3n
        }
    );

    return true;
}

export function createRequestDeadlockPartySetModeHandler() {
    return requestDeadlockPartySetMode;
}

export default requestDeadlockPartySetMode;
