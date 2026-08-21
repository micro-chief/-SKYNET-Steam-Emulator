// === SKYNET_DEADLOCK_PARTY_ACTION_V2 ===

import {
    encodeProto
} from "../framework/gc";

import {
    CMsgClientToGCPartyAction,
    CMsgClientToGCPartyActionResponse,
    GcRoute,
    ProtoDescriptor
} from "../generated/protobuf";

import {
    getCurrentDeadlockPartyState
} from "./RequestDeadlockPartyCreate";

import {
    generateDeadlockPartyJoinCode,
    registerDeadlockPartyJoinCode,
    releaseDeadlockPartyJoinCode
} from "./PartyCodeRegistry";

const REQUEST_ID =
    9129;

const RESPONSE_ID =
    9130;

const PARTY_SO_TYPE_ID =
    105;

/*
 * Current Deadlock CMsgClientToGCPartyAction.EAction
 */
const PartyAction = {
    KickUser:
        1,

    CancelInvite:
        2,

    CancelFindMatch:
        3,

    SetPlayerType:
        5,

    EnablePartyCode:
        7,

    SetMemberTeam:
        8,

    SetChatMode:
        9,

    SetPlayerSlot:
        10,

    SetSearchKey:
        12,

    SetBotDifficulty:
        13,

    SetRandomizedLanes:
        14,

    SetServerRegion:
        15,

    SetPubliclyVisible:
        16,

    SetCheatsEnabled:
        17,

    SwapTeams:
        18,

    ShuffleLobby:
        19,

    ShuffleLanes:
        20,

    SetDuplicateHeroesEnabled:
        21,

    SetDesiresLaningTogether:
        23,

    SetMMPreference:
        24,

    SetPrivateLobbyGameMode:
        25
} as const;

const requestProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyAction"
} as ProtoDescriptor<CMsgClientToGCPartyAction>;

const responseProto = {
    name:
        "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyActionResponse"
} as ProtoDescriptor<CMsgClientToGCPartyActionResponse>;

export const RequestDeadlockPartyActionRoute = {
    requestId:
        REQUEST_ID,

    request:
        requestProto,

    responseId:
        RESPONSE_ID,

    response:
        responseProto
} as GcRoute<
    CMsgClientToGCPartyAction,
    CMsgClientToGCPartyActionResponse
>;

let updateVersion =
    0n;

function findMember(
    party: any,
    targetAccountId: number,
    fallbackAccountId: number
): any {
    const wanted =
        targetAccountId !== 0
            ? targetAccountId
            : fallbackAccountId;

    for (
        let i = 0;
        i < party.members.length;
        i++
    ) {
        if (
            party.members[i].account_id ===
            wanted
        ) {
            return party.members[i];
        }
    }

    return null;
}

function ensurePrivateSettings(
    party: any
): any {
    if (
        !party.private_lobby_settings
    ) {
        party.private_lobby_settings = {
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
                false
        };
    }

    return party.private_lobby_settings;
}

function setPlayerSlot(
    party: any,
    accountId: number,
    slotId: any
): void {
    // === SKYNET_SET_PLAYER_SLOT_ZERO_UNASSIGNED_V3 ===

    const settings =
        ensurePrivateSettings(
            party
        );

    const slots =
        settings.match_slots ??
        [];

    /*
     * Keep TypeSharp typing simple.
     * uint_value is already numeric after protobuf decode.
     */
    const requestedSlot: any =
        slotId;

    let previousSlot: any =
        0;

    /*
     * Valve keeps match_slots entries and only clears
     * player_account_id on the previous slot.
     */
    for (
        let i = 0;
        i < slots.length;
        i++
    ) {
        const slot =
            slots[i];

        if (
            slot.player_account_id ===
            accountId
        ) {
            previousSlot =
                slot.slot_id;

            slot.player_account_id =
                0;
        }
    }

    /*
     * Official capture:
     *
     *   action_id=10
     *   uint_value=0
     *
     * means "Без команды".
     *
     * There is NO match_slots entry with slot_id=0.
     */
    if (
        requestedSlot == 0
    ) {
        settings.match_slots =
            slots;

        log(
            "[9129-SLOT] ========================================"
        );

        log(
            "[9129-SLOT] state=UNASSIGNED"
        );

        log(
            "[9129-SLOT] account_id=" +
            accountId
        );

        log(
            "[9129-SLOT] previous_slot=" +
            previousSlot
        );

        log(
            "[9129-SLOT] requested_slot=0"
        );

        log(
            "[9129-SLOT] slots.count=" +
            slots.length
        );

        for (
            let i = 0;
            i < slots.length;
            i++
        ) {
            log(
                "[9129-SLOT] slot[" +
                i +
                "].slot_id=" +
                slots[i].slot_id
            );

            log(
                "[9129-SLOT] slot[" +
                i +
                "].account_id=" +
                slots[i].player_account_id
            );
        }

        return;
    }

    /*
     * Non-zero destination.
     */
    let destinationFound =
        false;

    for (
        let i = 0;
        i < slots.length;
        i++
    ) {
        const slot =
            slots[i];

        if (
            slot.slot_id ==
            requestedSlot
        ) {
            slot.player_account_id =
                accountId;

            destinationFound =
                true;

            break;
        }
    }

    /*
     * PartyCreate may not yet contain every possible lobby slot.
     * Once discovered, keep the slot permanently just like Valve.
     */
    if (!destinationFound) {
        slots.push({
            slot_id:
                requestedSlot,

            player_account_id:
                accountId
        });
    }

    settings.match_slots =
        slots;

    /*
     * CRITICAL:
     *
     * SetPlayerSlot modifies ONLY match_slots.
     *
     * Do not touch:
     *   party.members
     *   Member.team
     *   Member.player_type
     */
    log(
        "[9129-SLOT] ========================================"
    );

    log(
        "[9129-SLOT] state=ASSIGNED"
    );

    log(
        "[9129-SLOT] account_id=" +
        accountId
    );

    log(
        "[9129-SLOT] previous_slot=" +
        previousSlot
    );

    log(
        "[9129-SLOT] requested_slot=" +
        requestedSlot
    );

    log(
        "[9129-SLOT] destination_existed=" +
        destinationFound
    );

    log(
        "[9129-SLOT] slots.count=" +
        slots.length
    );

    for (
        let i = 0;
        i < slots.length;
        i++
    ) {
        log(
            "[9129-SLOT] slot[" +
            i +
            "].slot_id=" +
            slots[i].slot_id
        );

        log(
            "[9129-SLOT] slot[" +
            i +
            "].account_id=" +
            slots[i].player_account_id
        );
    }
}


function setPlayerType(
    party: any,
    member: any,
    accountId: number,
    playerType: any
): void {
    const numericPlayerType =
        Number(
            playerType
        );

    /*
     * Official CSOCitadelParty.EPlayerType:
     *
     *   0 = Player
     *   1 = Spectator
     */
    member.player_type =
        numericPlayerType;

    /*
     * A spectator is still a Party Member,
     * but is not occupying a player match slot.
     */
    if (
        numericPlayerType ===
        1
    ) {
        const settings =
            ensurePrivateSettings(
                party
            );

        const oldSlots =
            settings.match_slots ??
            [];

        const nextSlots: any[] =
            [];

        for (
            let i = 0;
            i < oldSlots.length;
            i++
        ) {
            const slot =
                oldSlots[i];

            if (
                slot.player_account_id !==
                accountId
            ) {
                nextSlots.push(
                    slot
                );
            }
        }

        settings.match_slots =
            nextSlots;
    }

    log(
        "[9129-TYPE] account_id=" +
        accountId
    );

    log(
        "[9129-TYPE] player_type=" +
        numericPlayerType
    );

    log(
        "[9129-TYPE] spectator=" +
        (
            numericPlayerType ===
            1
        )
    );

    log(
        "[9129-TYPE] members.count=" +
        party.members.length
    );

    if (
        party.private_lobby_settings
    ) {
        log(
            "[9129-TYPE] match_slots.count=" +
            party.private_lobby_settings.match_slots.length
        );
    }
}

function mutate(
    ctx: any,
    party: any,
    request: any
): boolean {
    const actionId =
        request.action_id ??
        0;

    const targetAccountId =
        request.target_account_id ??
        0;

    const effectiveAccountId =
        targetAccountId !== 0
            ? targetAccountId
            : ctx.accountId;

    const uintValue =
        request.uint_value ??
        0n;

    const boolValue =
        request.bool_value ??
        false;

    const strValue =
        request.str_value ??
        "";

    const member =
        findMember(
            party,
            effectiveAccountId,
            ctx.accountId
        );

    const settings =
        ensurePrivateSettings(
            party
        );

    log(
        "[9129] ========================================"
    );

    log(
        "[9129] action_id=" +
        actionId
    );

    log(
        "[9129] target_account_id=" +
        targetAccountId
    );

    log(
        "[9129] uint_value=" +
        uintValue
    );

    log(
        "[9129] bool_value=" +
        boolValue
    );

    log(
        "[9129] str_value='" +
        strValue +
        "'"
    );

// === SKYNET_PARTY_ACTION_CANCEL_FIND_MATCH_V1_BEGIN ===
    /*
     * Private Lobby cancel-search uses PartyAction 9129,
     * action_id=3.
     *
     * FindingMatch itself is represented by the optional
     * CSOCitadelParty.match_making_start_time field.
     *
     * StartMatch sets the field.
     * CancelFindMatch removes it.
     *
     * The normal RequestDeadlockPartyAction tail will then:
     *
     *   encode CSOCitadelParty
     *   -> send 26 type_id=105
     *   -> reply 9130 result=1
     */
    if (
        actionId ===
        PartyAction.CancelFindMatch
    ) {
        log(
            "[9129-CANCEL-MM] ========================================"
        );

        log(
            "[9129-CANCEL-MM] previous match_making_start_time=" +
            (
                party.match_making_start_time ??
                0
            )
        );

        party.match_making_start_time =
            undefined;

        log(
            "[9129-CANCEL-MM] match_making_start_time=ABSENT"
        );

        log(
            "[9129-CANCEL-MM] state=PRIVATE_LOBBY"
        );

        return true;
    }

// === SKYNET_PARTY_ACTION_CANCEL_FIND_MATCH_V1_END ===

    if (
        actionId ===
        PartyAction.SetPlayerType
    ) {
        if (!member) {
            return false;
        }

        setPlayerType(
            party,
            member,
            effectiveAccountId,
            uintValue
        );

        return true;
    }

    if (
        actionId ===
        PartyAction.EnablePartyCode
    ) {
        // === SKYNET_ENABLE_PARTY_CODE_ACTION7_V2 ===

        if (boolValue) {
            /*
             * Keep an existing non-zero code if Party already owns one.
             */
            if (
                party.join_code !=
                    undefined &&
                party.join_code !=
                    0 &&
                party.join_code !=
                    0n
            ) {
                registerDeadlockPartyJoinCode(
                    party.party_id,
                    party.join_code
                );

                log(
                    "[9129-CODE] reuse code=" +
                    party.join_code
                );
            }
            else {
                party.join_code =
                    generateDeadlockPartyJoinCode(
                        party.party_id
                    );

                log(
                    "[9129-CODE] generated code=" +
                    party.join_code
                );
            }
        }
        else {
            releaseDeadlockPartyJoinCode(
                party.party_id
            );

            party.join_code =
                0n;

            log(
                "[9129-CODE] disabled"
            );
        }

        return true;
    }

    if (
        actionId ===
        PartyAction.SetMemberTeam
    ) {
        if (!member) {
            return false;
        }

        member.team =
            uintValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetChatMode
    ) {
        party.chat_mode =
            uintValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetPlayerSlot
    ) {
        setPlayerSlot(
            party,
            effectiveAccountId,
            uintValue
        );

        return true;
    }

    if (
        actionId ===
        PartyAction.SetSearchKey
    ) {
        party.server_search_key =
            strValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetBotDifficulty
    ) {
        party.bot_difficulty =
            uintValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetRandomizedLanes
    ) {
        settings.randomize_lanes =
            boolValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetServerRegion
    ) {
        settings.server_region =
            uintValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetPubliclyVisible
    ) {
        settings.is_publicly_visible =
            boolValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetCheatsEnabled
    ) {
        settings.cheats_enabled =
            boolValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetDuplicateHeroesEnabled
    ) {
        settings.duplicate_heroes_enabled =
            boolValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetDesiresLaningTogether
    ) {
        party.desires_laning_together =
            boolValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetMMPreference
    ) {
        party.mm_preference =
            uintValue;

        return true;
    }

    if (
        actionId ===
        PartyAction.SetPrivateLobbyGameMode
    ) {
        party.game_mode =
            uintValue;

        return true;
    }

    /*
     * Swap/shuffle are accepted for now.
     *
     * They need the exact slot permutation rule,
     * but must not block other lobby controls.
     */
    if (
        actionId ===
            PartyAction.SwapTeams ||
        actionId ===
            PartyAction.ShuffleLobby ||
        actionId ===
            PartyAction.ShuffleLanes
    ) {
        // === SKYNET_CUSTOM_MATCH_SLOT_PERMUTATION_V11_BEGIN ===
        /*
         * Deadlock Custom Match PartyAction:
         *
         *   18 = swap teams
         *   19 = shuffle/redistribute players
         *   20 = shuffle lanes
         *
         * The existing handler already accepts these actions and
         * publishes CSOCitadelParty through msg 26 afterwards.
         *
         * Therefore mutate ONLY match_slots here.
         *
         * Proven occupied slot from current lobby:
         *   slot_id = 10
         *
         * Current working lobby layout is treated as:
         *
         *   10..15 = team A
         *   20..25 = team B
         *
         * Special/spectator slots are preserved.
         */

        if (
            party.private_lobby_settings ===
            undefined
        ) {
            party.private_lobby_settings = {
                match_slots: []
            };
        }

        if (
            party.private_lobby_settings.match_slots ===
            undefined
        ) {
            party.private_lobby_settings.match_slots =
                [];
        }

        const permutationSlots =
            party.private_lobby_settings.match_slots;

        log(
            "[9129-PERMUTE] ========================================"
        );

        log(
            "[9129-PERMUTE] action_id=" +
            actionId
        );

        log(
            "[9129-PERMUTE] slots.count=" +
            permutationSlots.length
        );

/*
         * ------------------------------------------------------------
         * 18 - SwapTeams
         *
         * Keep position inside the team:
         *
         *   10 <-> 20
         *   11 <-> 21
         *   ...
         *   15 <-> 25
         * ------------------------------------------------------------
         */
        if (
            actionId ===
            18
        ) {
            for (
                let slotIndex =
                    0;
                slotIndex <
                    permutationSlots.length;
                slotIndex++
            ) {
                const slot =
                    permutationSlots[
                        slotIndex
                    ];

                const oldSlotId =
                    slot.slot_id ??
                    0;

                let newSlotId =
                    oldSlotId;

                if (
                    oldSlotId >=
                        10 &&
                    oldSlotId <=
                        15
                ) {
                    newSlotId =
                        oldSlotId +
                        10;
                }
                else if (
                    oldSlotId >=
                        20 &&
                    oldSlotId <=
                        25
                ) {
                    newSlotId =
                        oldSlotId -
                        10;
                }

                slot.slot_id =
                    newSlotId;

                log(
                    "[9129-PERMUTE] SWAP account_id=" +
                    (
                        slot.player_account_id ??
                        0
                    ) +
                    " slot=" +
                    oldSlotId +
                    "->" +
                    newSlotId
                );
            }
        }

/*
         * ------------------------------------------------------------
         * 19 - ShuffleLobby
         *
         * We intentionally avoid Math.random() for TypeSharp.
         *
         * The mapping is a rotation through all 12 playable slots.
         * Every click therefore causes another valid permutation:
         *
         *   10..15 -> logical 0..5
         *   20..25 -> logical 6..11
         *   new = (old + 7) % 12
         *
         * +7 is coprime with 12, so repeated presses walk through
         * every playable position without collisions.
         * ------------------------------------------------------------
         */
        else if (
            actionId ===
            19
        ) {
            for (
                let slotIndex =
                    0;
                slotIndex <
                    permutationSlots.length;
                slotIndex++
            ) {
                const slot =
                    permutationSlots[
                        slotIndex
                    ];

                const oldSlotId =
                    slot.slot_id ??
                    0;

                let logicalIndex =
                    -1;

                if (
                    oldSlotId >=
                        10 &&
                    oldSlotId <=
                        15
                ) {
                    logicalIndex =
                        oldSlotId -
                        10;
                }
                else if (
                    oldSlotId >=
                        20 &&
                    oldSlotId <=
                        25
                ) {
                    logicalIndex =
                        6 +
                        (
                            oldSlotId -
                            20
                        );
                }

                if (
                    logicalIndex >=
                    0
                ) {
                    const newLogicalIndex =
                        (
                            logicalIndex +
                            7
                        ) %
                        12;

                    let newSlotId =
                        0;

                    if (
                        newLogicalIndex <
                        6
                    ) {
                        newSlotId =
                            10 +
                            newLogicalIndex;
                    }
                    else {
                        newSlotId =
                            20 +
                            (
                                newLogicalIndex -
                                6
                            );
                    }

                    slot.slot_id =
                        newSlotId;

                    log(
                        "[9129-PERMUTE] SHUFFLE_LOBBY account_id=" +
                        (
                            slot.player_account_id ??
                            0
                        ) +
                        " slot=" +
                        oldSlotId +
                        "->" +
                        newSlotId
                    );
                }
                else {
                    log(
                        "[9129-PERMUTE] SHUFFLE_LOBBY preserve slot=" +
                        oldSlotId
                    );
                }
            }
        }

/*
         * ------------------------------------------------------------
         * 20 - ShuffleLanes
         *
         * Rotate position by one slot while keeping current team.
         * ------------------------------------------------------------
         */
        else if (
            actionId ===
            20
        ) {
            for (
                let slotIndex =
                    0;
                slotIndex <
                    permutationSlots.length;
                slotIndex++
            ) {
                const slot =
                    permutationSlots[
                        slotIndex
                    ];

                const oldSlotId =
                    slot.slot_id ??
                    0;

                let newSlotId =
                    oldSlotId;

                if (
                    oldSlotId >=
                        10 &&
                    oldSlotId <=
                        15
                ) {
                    newSlotId =
                        10 +
                        (
                            (
                                oldSlotId -
                                10 +
                                1
                            ) %
                            6
                        );
                }
                else if (
                    oldSlotId >=
                        20 &&
                    oldSlotId <=
                        25
                ) {
                    newSlotId =
                        20 +
                        (
                            (
                                oldSlotId -
                                20 +
                                1
                            ) %
                            6
                        );
                }

                slot.slot_id =
                    newSlotId;

                log(
                    "[9129-PERMUTE] SHUFFLE_LANES account_id=" +
                    (
                        slot.player_account_id ??
                        0
                    ) +
                    " slot=" +
                    oldSlotId +
                    "->" +
                    newSlotId
                );
            }
        }

/*
         * Do NOT force member.team here.
         *
         * Existing proven state has:
         *
         *   match_slot.slot_id = 10
         *   member.team         = null
         *
         * while the client already renders the player in the correct
         * custom-lobby team. Therefore match_slots remains the source
         * of truth for this experiment.
         */

        log(
            "[9129-PERMUTE] mutation complete"
        );

        for (
            let dumpIndex =
                0;
            dumpIndex <
                permutationSlots.length;
            dumpIndex++
        ) {
            const dumpSlot =
                permutationSlots[
                    dumpIndex
                ];

            log(
                "[9129-PERMUTE] AFTER slot[" +
                dumpIndex +
                "].slot_id=" +
                (
                    dumpSlot.slot_id ??
                    0
                ) +
                " account_id=" +
                (
                    dumpSlot.player_account_id ??
                    0
                )
            );
        }

// === SKYNET_CUSTOM_MATCH_SLOT_PERMUTATION_V11_END ===

        return true;
    }

    log(
        "[9129] unsupported action=" +
        actionId
    );

    return true;
}

export function requestDeadlockPartyAction(
    ctx: any
): boolean {

    // === SKYNET_PARTY_ACTION_FORENSIC_TRACE_V1 ===

    const forensicParty =
        getCurrentDeadlockPartyState();

    const forensicRequest =
        ctx.request;

    log(
        "[9129-TRACE] ========================================"
    );

    log(
        "[9129-TRACE] action_id=" +
        (
            forensicRequest.action_id ??
            0
        )
    );

    log(
        "[9129-TRACE] target_account_id=" +
        (
            forensicRequest.target_account_id ??
            0
        )
    );

    log(
        "[9129-TRACE] uint_value=" +
        (
            forensicRequest.uint_value ??
            0
        )
    );

    log(
        "[9129-TRACE] bool_value=" +
        (
            forensicRequest.bool_value ??
            false
        )
    );

    log(
        "[9129-TRACE] str_value='" +
        (
            forensicRequest.str_value ??
            ""
        ) +
        "'"
    );

    if (
        forensicParty
    ) {
        log(
            "[9129-TRACE] BEFORE members.count=" +
            forensicParty.members.length
        );

        for (
            let forensicMemberIndex = 0;
            forensicMemberIndex <
                forensicParty.members.length;
            forensicMemberIndex++
        ) {
            const forensicMember =
                forensicParty.members[
                    forensicMemberIndex
                ];

            log(
                "[9129-TRACE] BEFORE member[" +
                forensicMemberIndex +
                "].account_id=" +
                forensicMember.account_id
            );

            log(
                "[9129-TRACE] BEFORE member[" +
                forensicMemberIndex +
                "].player_type=" +
                forensicMember.player_type
            );

            log(
                "[9129-TRACE] BEFORE member[" +
                forensicMemberIndex +
                "].team=" +
                forensicMember.team
            );
        }

        const forensicSettings =
            forensicParty.private_lobby_settings;

        if (
            forensicSettings
        ) {
            const forensicSlots =
                forensicSettings.match_slots ??
                [];

            log(
                "[9129-TRACE] BEFORE slots.count=" +
                forensicSlots.length
            );

            for (
                let forensicSlotIndex = 0;
                forensicSlotIndex <
                    forensicSlots.length;
                forensicSlotIndex++
            ) {
                const forensicSlot =
                    forensicSlots[
                        forensicSlotIndex
                    ];

                log(
                    "[9129-TRACE] BEFORE slot[" +
                    forensicSlotIndex +
                    "].slot_id=" +
                    forensicSlot.slot_id
                );

                log(
                    "[9129-TRACE] BEFORE slot[" +
                    forensicSlotIndex +
                    "].account_id=" +
                    forensicSlot.player_account_id
                );
            }
        }
    }


    const request =
        ctx.request;

    const party =
        getCurrentDeadlockPartyState();

    if (!party) {
        ctx.reply({
            result:
                2
        });

        return true;
    }

    const requestedPartyId =
        request.party_id ??
        0n;

    if (
        requestedPartyId !== 0n &&
        requestedPartyId !==
            party.party_id
    ) {
        ctx.reply({
            result:
                2
        });

        return true;
    }

    if (
        !mutate(
            ctx,
            party,
            request
        )
    ) {
        ctx.reply({
            result:
                4
        });

        return true;
    }

    // === SKYNET_CUSTOM_LOBBY_PARTY_ACTION_SETTINGS_V1_BEGIN ===

    /*
     * Official Valve CMsgClientToGCPartyAction.EAction:
     *
     *   14 = k_eSetRandomizedLanes
     *   16 = k_eSetPubliclyVisible
     *   17 = k_eSetCheatsEnabled
     *   21 = k_eSetDuplicateHeroesEnabled
     *
     * Captured locally:
     *
     *   action 14 -> bool_value
     *   action 16 -> bool_value
     *   action 17 -> bool_value
     *   action 21 -> bool_value
     */

    const settingsRequest: any =
        ctx.request;

    const settingsActionId =
        settingsRequest.action_id ??
        0;

    const settingsBoolValue =
        settingsRequest.bool_value ??
        false;

    let privateSettings: any =
        party.private_lobby_settings;

    if (
        privateSettings ==
        null
    ) {
        /*
         * Keep the already-established match slot shape if this
         * handler is ever reached with missing PrivateLobbySettings.
         */
        privateSettings = {
            match_slots: []
        };

        party.private_lobby_settings =
            privateSettings;
    }

    if (
        settingsActionId ===
        14
    ) {
        // SKYNET_CUSTOM_LOBBY_SETTINGS_CAMEL_SNAKE_SYNC_V1
        privateSettings.randomize_lanes =
            settingsBoolValue;

        privateSettings.randomizeLanes =
            settingsBoolValue;

        log(
            "[9129-SETTINGS] randomize_lanes=" +
            privateSettings.randomize_lanes +
            " randomizeLanes=" +
            privateSettings.randomizeLanes
        );
    }
    else if (
        settingsActionId ===
        16
    ) {
        privateSettings.is_publicly_visible =
            settingsBoolValue;

        privateSettings.isPubliclyVisible =
            settingsBoolValue;

        log(
            "[9129-SETTINGS] is_publicly_visible=" +
            privateSettings.is_publicly_visible +
            " isPubliclyVisible=" +
            privateSettings.isPubliclyVisible
        );
    }
    else if (
        settingsActionId ===
        17
    ) {
        privateSettings.cheats_enabled =
            settingsBoolValue;

        privateSettings.cheatsEnabled =
            settingsBoolValue;

        log(
            "[9129-SETTINGS] cheats_enabled=" +
            privateSettings.cheats_enabled +
            " cheatsEnabled=" +
            privateSettings.cheatsEnabled
        );
    }
    else if (
        settingsActionId ===
        21
    ) {
        privateSettings.duplicate_heroes_enabled =
            settingsBoolValue;

        privateSettings.duplicateHeroesEnabled =
            settingsBoolValue;

        log(
            "[9129-SETTINGS] duplicate_heroes_enabled=" +
            privateSettings.duplicate_heroes_enabled +
            " duplicateHeroesEnabled=" +
            privateSettings.duplicateHeroesEnabled
        );
    }

    // === SKYNET_CUSTOM_LOBBY_PARTY_ACTION_SETTINGS_V1_END ===


    log(
        "[9129-STATE] ===== outbound party state ====="
    );

    for (
        let stateMemberIndex = 0;
        stateMemberIndex < party.members.length;
        stateMemberIndex++
    ) {
        const stateMember =
            party.members[
                stateMemberIndex
            ];

        log(
            "[9129-STATE] member[" +
            stateMemberIndex +
            "].account_id=" +
            stateMember.account_id
        );

        log(
            "[9129-STATE] member[" +
            stateMemberIndex +
            "].player_type=" +
            stateMember.player_type
        );

        log(
            "[9129-STATE] member[" +
            stateMemberIndex +
            "].team=" +
            stateMember.team
        );
    }

    if (
        party.private_lobby_settings
    ) {
        const stateSlots =
            party.private_lobby_settings.match_slots ??
            [];

        log(
            "[9129-STATE] match_slots.count=" +
            stateSlots.length
        );

        for (
            let stateSlotIndex = 0;
            stateSlotIndex < stateSlots.length;
            stateSlotIndex++
        ) {
            const stateSlot =
                stateSlots[
                    stateSlotIndex
                ];

            log(
                "[9129-STATE] slot[" +
                stateSlotIndex +
                "].slot_id=" +
                stateSlot.slot_id
            );

            log(
                "[9129-STATE] slot[" +
                stateSlotIndex +
                "].account_id=" +
                stateSlot.player_account_id
            );
        }
    }

    // === SKYNET_CUSTOM_LOBBY_REGIONS_ACTION15_V1_BEGIN ===
    /*
     * PartyAction:
     *
     *   action_id = 15
     *   uint_value = selected server region
     *
     * 0 means automatic selection.
     *
     * Keep snake_case + camelCase synchronized for the
     * same ProtoCodec alias-precedence reason as the
     * other Custom Lobby settings.
     */

    const skynetRegionActionRequest9129: any =
        ctx.request;

    const skynetRegionActionId9129 =
        Number(
            skynetRegionActionRequest9129.actionId ??
            skynetRegionActionRequest9129.action_id ??
            0
        );

    if (
        skynetRegionActionId9129 ===
        15
    ) {
        const skynetRegionIds9129 = [
            7,
            1,
            27,
            31,
            23,
            22,
            2,
            5,
            28,
            19,
            8,
            14,
            44,
            24,
            3,
            52,
            21,
            9,
            45,
            15,
            39,
            38,
            11,
            10
        ];

        const skynetRegionSettings9129: any =
            party.privateLobbySettings ??
            party.private_lobby_settings ??
            {};

        /*
         * Re-publish the exact available list as well.
         * This makes action 15 self-healing even if an older
         * in-memory Party object did not contain it.
         */
        const skynetAvailableRegions9129: any[] =
            [];

        for (
            let skynetRegionIndex9129 =
                0;
    
            skynetRegionIndex9129 <
                skynetRegionIds9129.length;
    
            skynetRegionIndex9129++
        ) {
            const skynetRegionId9129 =
                skynetRegionIds9129[
                    skynetRegionIndex9129
                ];

            skynetAvailableRegions9129.push({
                region_id:
                    skynetRegionId9129,

                regionId:
                    skynetRegionId9129
            });
        }

        skynetRegionSettings9129.available_regions =
            skynetAvailableRegions9129;

        skynetRegionSettings9129.availableRegions =
            skynetAvailableRegions9129;

        const skynetRawSelectedRegion9129 =
            skynetRegionActionRequest9129.uintValue ??
            skynetRegionActionRequest9129.uint_value ??
            0;

        const skynetRequestedRegion9129 =
            Number(
                skynetRawSelectedRegion9129
            );

        let skynetRequestedRegionValid9129 =
            skynetRequestedRegion9129 ===
            0;

        for (
            let skynetRegionCheck9129 =
                0;
    
            skynetRegionCheck9129 <
                skynetRegionIds9129.length;
    
            skynetRegionCheck9129++
        ) {
            if (
                skynetRegionIds9129[
                    skynetRegionCheck9129
                ] ===
                skynetRequestedRegion9129
            ) {
                skynetRequestedRegionValid9129 =
                    true;

                break;
            }
        }

        if (
            skynetRequestedRegionValid9129
        ) {
            skynetRegionSettings9129.server_region =
                skynetRequestedRegion9129;

            skynetRegionSettings9129.serverRegion =
                skynetRequestedRegion9129;

            log(
                "[9129-REGION] server_region=" +
                skynetRequestedRegion9129 +
                " serverRegion=" +
                skynetRequestedRegion9129
            );
        }
        else {
            log(
                "[9129-REGION] rejected unknown region=" +
                skynetRequestedRegion9129
            );
        }

        party.private_lobby_settings =
            skynetRegionSettings9129;

        party.privateLobbySettings =
            skynetRegionSettings9129;
    }

    // === SKYNET_CUSTOM_LOBBY_REGIONS_ACTION15_V1_END ===

    const bytes =
        encodeProto(
            "SKYNET.Server.GameCoordinator.Citadel.CSOCitadelParty",
            party
        );

    if (
        updateVersion ===
        0n
    ) {
        updateVersion =
            party.party_id +
            10n;
    }
    else {
        updateVersion =
            updateVersion +
            1n;
    }

    const update = {
        objects_modified: [
            {
                type_id:
                    PARTY_SO_TYPE_ID,

                object_data:
                    bytes
            }
        ],

        objects_added:
            [],

        objects_removed:
            [],

        version:
            updateVersion,

        owner_soid: {
            type:
                2,

            id:
                party.party_id
        },

        service_id:
            1
    };

    ctx.send(
        26,
        "CMsgSOMultipleObjects",
        update
    );

    ctx.reply({
        result:
            1
    });

    log(
        "[9129] sequence=9129->26->9130 bytes=" +
        bytes.length
    );

    return true;
}
