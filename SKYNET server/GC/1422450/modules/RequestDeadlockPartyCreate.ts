import {
    encodeProto
} from "../framework/gc";

import {
    CMsgClientToGCPartyCreate,
    CMsgClientToGCPartyCreateResponse,
    EGCCitadelClientMessages,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyCreate"
} as ProtoDescriptor<CMsgClientToGCPartyCreate>;



const PARTY_SO_TYPE_ID = 105;

// === SKYNET_DEADLOCK_PARTY_SHARED_STATE ===

let currentDeadlockPartyState: any =
    null;

export function getCurrentDeadlockPartyState(): any {
    return currentDeadlockPartyState;
}

export function clearCurrentDeadlockPartyState(): void {
    currentDeadlockPartyState =
        null;
}


const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyCreateResponse"
} as ProtoDescriptor<CMsgClientToGCPartyCreateResponse>;

export const RequestDeadlockPartyCreateRoute = {
    requestId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCPartyCreate,

    request:
        requestProto,

    responseId:
        EGCCitadelClientMessages
            .k_EMsgClientToGCPartyCreateResponse,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCPartyCreate,
    CMsgClientToGCPartyCreateResponse
>;

function makePartyId(
    ctx: any
): bigint {
    // Stable per local user/session and safely inside uint64.
    return (
        ctx.steamId +
        1422450n
    );
}

export function requestDeadlockPartyCreate(
    ctx: any
): boolean {
    const request =
        ctx.request;

    

    const partyId =
        makePartyId(
            ctx
        );

    /*
     * Private lobby join code.
     *
     * Keep this separate from party_id.
     * Derive a compact 6-digit value from the newly generated partyId.
     */
    // === SKYNET_JOIN_CODE_FROM_NOW_V1 ===
    const joinCodeSeed =
        now();

    const joinCode =
        (
            joinCodeSeed %
            900000
        ) +
        100000;

    log(
        "[9123-CODE] now=" +
        joinCodeSeed
    );

    log(
        "[9123-CODE] join_code=" +
        joinCode
    );

    const clientVersion =
        request.party_mm_info
            ?.client_version ??
        1;

    const platform =
        request.party_mm_info
            ?.platform ??
        0;

    const regionMode =
        request.region_mode ??
        request.party_mm_info
            ?.region_mode ??
        0;

    /*
     * 9123 does not contain match_mode.
     *
     * For custom/private-lobby creation the real signal is:
     *
     *   request.is_private_lobby == true
     *
     * CSOCitadelParty, however, DOES contain match_mode.
     * Therefore PrivateLobby must be reflected explicitly in the SO.
     */
    const isPrivateLobby =
        request.is_private_lobby ??
        false;

    /*
     * CMsgClientToGCPartyCreate does not send match_mode.
     *
     * CSOCitadelParty does.
     *
     * ECitadelMatchMode:
     *   0 = Invalid
     *   1 = Unranked
     *   2 = PrivateLobby
     */
    const matchMode =
        isPrivateLobby
            ? 2
            : 0;

    /*
     * MIRROR POLICY:
     *
     * Do not invent values here.
     *
     * The client already sent the intended game mode,
     * bot difficulty, matchmaking preference and
     * PrivateLobbySettings.
     */
    const gameMode =
        request.game_mode ??
        0;

    const botDifficulty =
        request.bot_difficulty ??
        0;

    const mmPreference =
        request.mm_preference ??
        0;

        // === SKYNET_PARTY_EXPERIMENT_N_CAPTURE_SHAPED_PARTY ===

    /*
     * Experiment N:
     *
     * Build CSOCitadelParty with the same PRESENCE SHAPE
     * observed in the real 9123 PartyCreate capture.
     *
     * Identity/session-specific values remain local:
     *   party_id
     *   account_id
     *   compatibility_version
     *   platform
     *
     * The remaining values reproduce the captured
     * private-lobby SO structure.
     */

    const privateLobbySettings: any = {
        /*
         * field 3
         */
        randomize_lanes:
            true,

        /*
         * field 4
         *
         * Real capture:
         * server_region = 44
         */
        server_region:
            44,

        /*
         * field 6
         *
         * Presence matters: Valve explicitly encoded false.
         */
        is_publicly_visible:
            false,

        /*
         * field 7
         */
        cheats_enabled:
            true,

        /*
         * field 8:
         * repeated CSOCitadelParty.ServerRegion
         *
         * IMPORTANT:
         * these are nested messages:
         *
         *   { region_id: N }
         *
         * NOT raw numbers.
         */
        available_regions: [
            { region_id: 7 },
            { region_id: 1 },
            { region_id: 27 },
            { region_id: 31 },
            { region_id: 23 },
            { region_id: 22 },
            { region_id: 2 },
            { region_id: 5 },
            { region_id: 28 },
            { region_id: 19 },
            { region_id: 8 },
            { region_id: 14 },
            { region_id: 44 },
            { region_id: 24 },
            { region_id: 3 },
            { region_id: 52 },
            { region_id: 21 },
            { region_id: 9 },
            { region_id: 45 },
            { region_id: 15 },
            { region_id: 39 },
            { region_id: 38 },
            { region_id: 11 },
            { region_id: 10 }
        ],

        /*
         * field 9
         */
        duplicate_heroes_enabled:
            true
    };

    // === SKYNET_PARTY_CREATE_MODE_SPLIT_V1 ===

    /*
     * IMPORTANT:
     *
     * 9123 is used for BOTH:
     *
     *   - ordinary group / party creation
     *   - custom/private match creation
     *
     * Do not make every Party a custom lobby.
     *
     * The reliable discriminator in our captures/request model is the
     * actual presence of private_lobby_settings.
     */
    // === SKYNET_PARTY_CREATE_PRIVATE_FLAG_V2 ===
    const isCustomMatch =
        (
            request.is_private_lobby ??
            false
        ) ===
        true;

    log(
        "[9123-MODE] request.is_private_lobby=" +
        (
            request.is_private_lobby ??
            false
        )
    );

    log(
        "[9123-MODE] private_lobby_settings.present=" +
        (
            request.private_lobby_settings !=
            undefined
        )
    );

    log(
        "[9123-MODE] resolved=" +
        (
            isCustomMatch
                ? "CUSTOM_MATCH"
                : "NORMAL_PARTY"
        )
    );

    log(
        "[9123-MODE] private_lobby_settings.present=" +
        isCustomMatch
    );

    log(
        "[9123-MODE] request.is_private_lobby=" +
        (
            request.is_private_lobby ??
            false
        )
    );

    const party: any = {
        party_id:
            partyId,

        members: [
            {
                account_id:
                    ctx.accountId,

                persona_name:
                    "gagaga",

                rights_flags:
                    3,

                is_ready:
                    false,

                player_type:
                    0,

                compatibility_version:
                    clientVersion,

                platform:
                    platform,

                permissions: 3n,

                new_player_progress: 30n,

                owned_heroes:
                    [],

                low_priority_games_remaining:
                    0
            ,

                // SKYNET_RANKED_PERMISSION_BIT_V1_PARTY_CREATE
                // ECitadelAccountPermissionFlag.Ranked = 1
                // previous=2, current=3 (2 | Ranked)


                // SKYNET_RANKED_PARTY_ELIGIBILITY_OFFICIAL_CAPTURE_V3
                ranked_scores: [
                    {
                        rank_type: 1,
                        rank_interval: 1,
                        unlocked_heroes: [14, 63, 64],
                        in_calibration: true
                    }
                ],}
        ],

        invites:
            [],

        left_members:
            [],

        /*
         * Ordinary groups may still have a join/invite code.
         *
         * A join code alone must NOT imply Custom Match.
         */
        join_code:
            joinCode,

        server_search_key:
            request.server_search_key ??
            "",

        chat_mode:
            1,

        region_mode:
            regionMode,

        desires_laning_together:
            false,

        mm_preference:
            mmPreference,

        hideout_search_key:
            request.hideout_search_key ??
            ""
    };

    /*
     * ============================================================
     * CUSTOM MATCH ONLY
     * ============================================================
     *
     * These properties MUST NOT even exist on an ordinary party
     * object. In particular, do not serialize an empty
     * private_lobby_settings message for normal group creation.
     */
    if (isCustomMatch) {
        party.is_private_lobby =
            true;

        party.match_mode =
            2;

        party.game_mode =
            gameMode;

        party.bot_difficulty =
            botDifficulty;

        party.private_lobby_settings =
            request.private_lobby_settings;

        log(
            "[9123-MODE] mode=CUSTOM_MATCH"
        );
    }
    else {
        log(
            "[9123-MODE] mode=NORMAL_PARTY"
        );
    }


// === SKYNET_PARTY_SO_DIAGNOSTICS_BEGIN ===

    log(
        "[9123-PARTY-SO] ===== outbound CSOCitadelParty ====="
    );

    log(
        "[9123-PARTY-SO] ctx.account_id=" +
        ctx.accountId
    );

    log(
        "[9123-PARTY-SO] ctx.steam_id=" +
        ctx.steamId
    );

    log(
        "[9123-PARTY-SO] party.party_id=" +
        (
            party.party_id ??
            0
        )
    );

    log(
        "[9123-PARTY-SO] party.join_code=" +
        (
            party.join_code ??
            0
        )
    );

    log(
        "[9123-PARTY-SO] party.match_mode=" +
        (
            party.match_mode ??
            -1
        )
    );

    log(
        "[9123-PARTY-SO] party.game_mode=" +
        (
            party.game_mode ??
            -1
        )
    );

    log(
        "[9123-PARTY-SO] party.bot_difficulty=" +
        (
            party.bot_difficulty ??
            -1
        )
    );

    log(
        "[9123-PARTY-SO] party.region_mode=" +
        (
            party.region_mode ??
            -1
        )
    );

    log(
        "[9123-PARTY-SO] party.mm_preference=" +
        (
            party.mm_preference ??
            -1
        )
    );

    log(
        "[9123-PARTY-SO] party.is_private_lobby=" +
        (
            party.is_private_lobby ??
            false
        )
    );

    log(
        "[9123-PARTY-SO] party.server_search_key='" +
        (
            party.server_search_key ??
            ""
        ) +
        "'"
    );

    log(
        "[9123-PARTY-SO] party.hideout_search_key='" +
        (
            party.hideout_search_key ??
            ""
        ) +
        "'"
    );

    const diagnosticMembers =
        party.members ??
        [];

    log(
        "[9123-PARTY-SO] members.count=" +
        diagnosticMembers.length
    );

    for (
        let diagnosticMemberIndex = 0;
        diagnosticMemberIndex < diagnosticMembers.length;
        diagnosticMemberIndex++
    ) {
        const diagnosticMember =
            diagnosticMembers[
                diagnosticMemberIndex
            ];

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].account_id=" +
            (
                diagnosticMember.account_id ??
                0
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].persona_name='" +
            (
                diagnosticMember.persona_name ??
                ""
            ) +
            "'"
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].rights_flags=" +
            (
                diagnosticMember.rights_flags ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].is_ready=" +
            (
                diagnosticMember.is_ready ??
                false
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].player_type=" +
            (
                diagnosticMember.player_type ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].team=" +
            (
                diagnosticMember.team ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].compatibility_version=" +
            (
                diagnosticMember.compatibility_version ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].platform=" +
            (
                diagnosticMember.platform ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].permissions=" +
            (
                diagnosticMember.permissions ??
                0
            )
        );

        log(
            "[9123-PARTY-SO] member[" +
            diagnosticMemberIndex +
            "].new_player_progress=" +
            (
                diagnosticMember.new_player_progress ??
                0
            )
        );
    }

    const diagnosticPrivate =
        party.private_lobby_settings;

    log(
        "[9123-PARTY-SO] private.present=" +
        (
            diagnosticPrivate !=
            undefined
        )
    );

    if (
        diagnosticPrivate !=
        undefined
    ) {
        log(
            "[9123-PARTY-SO] private.min_roster_size=" +
            (
                diagnosticPrivate.min_roster_size ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] private.randomize_lanes=" +
            (
                diagnosticPrivate.randomize_lanes ??
                false
            )
        );

        log(
            "[9123-PARTY-SO] private.server_region=" +
            (
                diagnosticPrivate.server_region ??
                -1
            )
        );

        log(
            "[9123-PARTY-SO] private.is_publicly_visible=" +
            (
                diagnosticPrivate.is_publicly_visible ??
                false
            )
        );

        log(
            "[9123-PARTY-SO] private.cheats_enabled=" +
            (
                diagnosticPrivate.cheats_enabled ??
                false
            )
        );

        log(
            "[9123-PARTY-SO] private.duplicate_heroes_enabled=" +
            (
                diagnosticPrivate.duplicate_heroes_enabled ??
                false
            )
        );

        const diagnosticSlots =
            diagnosticPrivate.match_slots ??
            [];

        log(
            "[9123-PARTY-SO] private.match_slots.count=" +
            diagnosticSlots.length
        );

        for (
            let diagnosticSlotIndex = 0;
            diagnosticSlotIndex < diagnosticSlots.length;
            diagnosticSlotIndex++
        ) {
            const diagnosticSlot =
                diagnosticSlots[
                    diagnosticSlotIndex
                ];

            log(
                "[9123-PARTY-SO] private.match_slots[" +
                diagnosticSlotIndex +
                "].slot_id=" +
                (
                    diagnosticSlot.slot_id ??
                    -1
                )
            );

            log(
                "[9123-PARTY-SO] private.match_slots[" +
                diagnosticSlotIndex +
                "].player_account_id=" +
                (
                    diagnosticSlot.player_account_id ??
                    0
                )
            );
        }

        const diagnosticRegions =
            diagnosticPrivate.available_regions ??
            [];

        log(
            "[9123-PARTY-SO] private.available_regions.count=" +
            diagnosticRegions.length
        );

        for (
            let diagnosticRegionIndex = 0;
            diagnosticRegionIndex < diagnosticRegions.length;
            diagnosticRegionIndex++
        ) {
            log(
                "[9123-PARTY-SO] private.available_regions[" +
                diagnosticRegionIndex +
                "]=" +
                diagnosticRegions[
                    diagnosticRegionIndex
                ]
            );
        }
    }

    log(
        "[9123-PARTY-SO] ===== end outbound CSOCitadelParty ====="
    );

    // === SKYNET_PARTY_SO_DIAGNOSTICS_END ===


        // === SKYNET_PARTY_UINT32_SENTINEL_NORMALIZATION ===
    //
    // Valve declares both fields as uint32.
    //
    // Our local lobby model uses -1 as an internal "unassigned" sentinel.
    // Convert it to UINT32_MAX only at the protobuf boundary.
    //
    if (
        party.members.length > 0 &&
        party.members[0].team < 0
    ) {
        party.members[0].team =
            4294967295;
    }

    if (
        party.private_lobby_settings &&
        party.private_lobby_settings.min_roster_size < 0
    ) {
        party.private_lobby_settings.min_roster_size =
            4294967295;
    }

    log(
        "[9123-PARTY-SO] protobuf.member[0].team=" +
        party.members[0].team
    );

    if (
        party.private_lobby_settings
    ) {
        log(
            "[9123-PARTY-SO] protobuf.private.min_roster_size=" +
            party.private_lobby_settings.min_roster_size
        );
    }

    // === SKYNET_DEADLOCK_PARTY_STATE_CAPTURE ===
    //
    // Keep the exact object accepted by CSOCitadelParty encoding.
    // PartyAction mutates this same object and emits it through SO 26.
    //
    currentDeadlockPartyState =
        party;

const partyBytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );
    // === SKYNET_PARTY_WIRE_FINGERPRINT_BEGIN ===

    /*
     * IMPORTANT:
     * These encodes are diagnostics only.
     * The original partyBytes remains untouched.
     */

    const wireEmpty =
        encodeProto(
            "CSOCitadelParty",
            {}
        );

    log(
        "[9123-WIRE] empty.bytes=" +
        wireEmpty.length
    );

    const wirePartyId =
        encodeProto(
            "CSOCitadelParty",
            {
                party_id:
                    party.party_id
            }
        );

    log(
        "[9123-WIRE] party_id.bytes=" +
        wirePartyId.length
    );

    const wireJoinCode =
        encodeProto(
            "CSOCitadelParty",
            {
                join_code:
                    party.join_code
            }
        );

    log(
        "[9123-WIRE] join_code.bytes=" +
        wireJoinCode.length
    );

    const wireMatchMode =
        encodeProto(
            "CSOCitadelParty",
            {
                match_mode:
                    party.match_mode
            }
        );

    log(
        "[9123-WIRE] match_mode.bytes=" +
        wireMatchMode.length
    );

    const wireGameMode =
        encodeProto(
            "CSOCitadelParty",
            {
                game_mode:
                    party.game_mode
            }
        );

    log(
        "[9123-WIRE] game_mode.bytes=" +
        wireGameMode.length
    );

    const wireBotDifficulty =
        encodeProto(
            "CSOCitadelParty",
            {
                bot_difficulty:
                    party.bot_difficulty
            }
        );

    log(
        "[9123-WIRE] bot_difficulty.bytes=" +
        wireBotDifficulty.length
    );

    const wireRegionMode =
        encodeProto(
            "CSOCitadelParty",
            {
                region_mode:
                    party.region_mode
            }
        );

    log(
        "[9123-WIRE] region_mode.bytes=" +
        wireRegionMode.length
    );

    const wireMmPreference =
        encodeProto(
            "CSOCitadelParty",
            {
                mm_preference:
                    party.mm_preference
            }
        );

    log(
        "[9123-WIRE] mm_preference.bytes=" +
        wireMmPreference.length
    );

    const wirePrivateFlag =
        encodeProto(
            "CSOCitadelParty",
            {
                is_private_lobby:
                    party.is_private_lobby
            }
        );

    log(
        "[9123-WIRE] is_private_lobby.bytes=" +
        wirePrivateFlag.length
    );

    const wireServerSearchKey =
        encodeProto(
            "CSOCitadelParty",
            {
                server_search_key:
                    party.server_search_key
            }
        );

    log(
        "[9123-WIRE] server_search_key.bytes=" +
        wireServerSearchKey.length
    );

    const wireHideoutSearchKey =
        encodeProto(
            "CSOCitadelParty",
            {
                hideout_search_key:
                    party.hideout_search_key
            }
        );

    log(
        "[9123-WIRE] hideout_search_key.bytes=" +
        wireHideoutSearchKey.length
    );

    const wireMemberAccount =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        account_id:
                            ctx.accountId
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.account_id.bytes=" +
        wireMemberAccount.length
    );

    const wireMemberPersona =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        persona_name:
                            "gagaga"
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.persona_name.bytes=" +
        wireMemberPersona.length
    );

    const wireMemberRights =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        rights_flags:
                            3
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.rights_flags.bytes=" +
        wireMemberRights.length
    );

    const wireMemberReady =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        is_ready:
                            true
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.is_ready.bytes=" +
        wireMemberReady.length
    );

    const wireMemberPlayerType =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        player_type:
                            1
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.player_type.bytes=" +
        wireMemberPlayerType.length
    );

    const wireMemberTeam =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        team:
                            1
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.team.bytes=" +
        wireMemberTeam.length
    );

    const wireMemberCompatibility =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        compatibility_version:
                            6677
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.compatibility_version.bytes=" +
        wireMemberCompatibility.length
    );

    const wireMemberPlatform =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        platform:
                            1
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.platform.bytes=" +
        wireMemberPlatform.length
    );

    const wireMemberPermissions =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        permissions:
                            1
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.permissions.bytes=" +
        wireMemberPermissions.length
    );

    const wireMemberProgress =
        encodeProto(
            "CSOCitadelParty",
            {
                members: [
                    {
                        new_player_progress:
                            1
                    }
                ]
            }
        );

    log(
        "[9123-WIRE] member.new_player_progress.bytes=" +
        wireMemberProgress.length
    );

    const wirePrivateMinRoster =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    min_roster_size:
                        1
                }
            }
        );

    log(
        "[9123-WIRE] private.min_roster_size.bytes=" +
        wirePrivateMinRoster.length
    );

    const wirePrivateRandomize =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    randomize_lanes:
                        true
                }
            }
        );

    log(
        "[9123-WIRE] private.randomize_lanes.bytes=" +
        wirePrivateRandomize.length
    );

    const wirePrivateRegion =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    server_region:
                        44
                }
            }
        );

    log(
        "[9123-WIRE] private.server_region.bytes=" +
        wirePrivateRegion.length
    );

    const wirePrivatePublic =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    is_publicly_visible:
                        true
                }
            }
        );

    log(
        "[9123-WIRE] private.is_publicly_visible.bytes=" +
        wirePrivatePublic.length
    );

    const wirePrivateCheats =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    cheats_enabled:
                        true
                }
            }
        );

    log(
        "[9123-WIRE] private.cheats_enabled.bytes=" +
        wirePrivateCheats.length
    );

    const wirePrivateDuplicate =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    duplicate_heroes_enabled:
                        true
                }
            }
        );

    log(
        "[9123-WIRE] private.duplicate_heroes_enabled.bytes=" +
        wirePrivateDuplicate.length
    );

    const wirePrivateEmptySlots =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    match_slots: []
                }
            }
        );

    log(
        "[9123-WIRE] private.match_slots.empty.bytes=" +
        wirePrivateEmptySlots.length
    );

    const wirePrivateEmptyRegions =
        encodeProto(
            "CSOCitadelParty",
            {
                private_lobby_settings: {
                    available_regions: []
                }
            }
        );

    log(
        "[9123-WIRE] private.available_regions.empty.bytes=" +
        wirePrivateEmptyRegions.length
    );

    log(
        "[9123-WIRE] real_party.bytes=" +
        partyBytes.length
    );

    // === SKYNET_PARTY_WIRE_FINGERPRINT_END ===


    /*
     * Existing proven Deadlock capture sequence:
     *
     *   9123
     *     -> 24 empty subscription
     *     -> 9124 success
     *     -> 24 CSOCitadelParty
     */


    /*
     * CMsgClientToGCPartyCreateResponse:
     *
     *   k_eSuccess = 1
     */
                    // === SKYNET_PARTY_EXPERIMENT_N_REAL_CREATE_BEGIN ===

    /*
     * REAL PARTY CREATE LIFECYCLE
     *
     * Capture:
     *
     *   24 empty Party cache
     *   9124 success
     *   24 full Party cache
     *
     * There is NO 26 and NO 9135 in this captured
     * PartyCreate sequence.
     */

    const partyCacheOwner = {
        /*
         * Confirmed from real capture.
         */
        type:
            2,

        /*
         * Confirmed:
         * Party owner ID equals party_id.
         */
        id:
            partyId
    };

    /*
     * Use local monotonic-like values.
     *
     * Both protobuf fields are fixed64, so these preserve
     * the same envelope shape without copying a foreign
     * GC's absolute version identifiers.
     */
    const initialCacheVersion =
        partyId;

    const cacheSyncVersion =
        partyId +
        1n;

    const fullCacheVersion =
        partyId +
        2n;

    /*
     * =====================================================
     * PHASE 1
     *
     * Real record 347:
     *
     * CMsgSOCacheSubscribed
     *   version
     *   owner_soid { type=2, id=party_id }
     *   service_list = [1]
     *   sync_version
     *
     * service_id is intentionally ABSENT.
     * objects is intentionally ABSENT.
     * =====================================================
     */

    const initialPartyCache = {
        version:
            initialCacheVersion,

        owner_soid:
            partyCacheOwner,

        service_list: [
            1
        ],

        sync_version:
            cacheSyncVersion
    };

    log(
        "[9123-SO-N] ===== phase 1: initial Party CacheSubscribed ====="
    );

    log(
        "[9123-SO-N] msg=24 initial"
    );

    log(
        "[9123-SO-N] owner.type=" +
        partyCacheOwner.type
    );

    log(
        "[9123-SO-N] owner.id=" +
        partyCacheOwner.id
    );

    log(
        "[9123-SO-N] version=" +
        initialCacheVersion
    );

    log(
        "[9123-SO-N] sync_version=" +
        cacheSyncVersion
    );

    log(
        "[9123-SO-N] service_id=ABSENT"
    );

    log(
        "[9123-SO-N] service_list[0]=1"
    );

    ctx.send(
        24,
        "CMsgSOCacheSubscribed",
        initialPartyCache
    );

    /*
     * =====================================================
     * PHASE 2
     *
     * Real record 348:
     *
     * 9124:
     *   result   = 1
     *   party_id = created party
     * =====================================================
     */

    log(
        "[9123-SO-N] ===== phase 2: PartyCreateResponse ====="
    );

    log(
        "[9123-SO-N] msg=9124"
    );

    log(
        "[9123-SO-N] result=1"
    );

    log(
        "[9123-SO-N] party_id=" +
        partyId
    );

    ctx.reply({
        result:
            1,

        party_id:
            partyId
    });

    /*
     * =====================================================
     * PHASE 3
     *
     * Real record 349:
     *
     * CMsgSOCacheSubscribed
     *
     *   objects:
     *     type_id = 105
     *     object_data = repeated bytes
     *
     * IMPORTANT:
     *
     * object_data here is:
     *
     *     [partyBytes]
     *
     * NOT:
     *
     *     partyBytes
     *
     * CMsgSOCacheSubscribed.SubscribedType.object_data
     * is repeated bytes.
     * =====================================================
     */

    const fullPartyCache = {
        objects: [
            {
                type_id:
                    PARTY_SO_TYPE_ID,

                object_data: [
                    partyBytes
                ]
            }
        ],

        version:
            fullCacheVersion,

        owner_soid:
            partyCacheOwner,

        /*
         * Confirmed in second real 24.
         */
        service_id:
            1,

        service_list: [
            0
        ],

        sync_version:
            cacheSyncVersion
    };

    log(
        "[9123-SO-N] ===== phase 3: full Party CacheSubscribed ====="
    );

    log(
        "[9123-SO-N] msg=24 full"
    );

    log(
        "[9123-SO-N] owner.type=" +
        partyCacheOwner.type
    );

    log(
        "[9123-SO-N] owner.id=" +
        partyCacheOwner.id
    );

    log(
        "[9123-SO-N] type_id=" +
        PARTY_SO_TYPE_ID
    );

    log(
        "[9123-SO-N] object_data.count=" +
        fullPartyCache.objects[0].object_data.length
    );

    log(
        "[9123-SO-N] partyBytes.bytes=" +
        partyBytes.length
    );

    log(
        "[9123-SO-N] service_id=1"
    );

    log(
        "[9123-SO-N] service_list[0]=0"
    );

    log(
        "[9123-SO-N] version=" +
        fullCacheVersion
    );

    log(
        "[9123-SO-N] sync_version=" +
        cacheSyncVersion
    );

    ctx.send(
        24,
        "CMsgSOCacheSubscribed",
        fullPartyCache
    );

    log(
        "[9123-SO-N] sequence=24(empty)->9124->24(full)"
    );

    // === SKYNET_PARTY_EXPERIMENT_N_REAL_CREATE_END ===

    return true;
}
