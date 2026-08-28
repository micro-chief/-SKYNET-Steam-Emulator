import { gc, HandlerContext, RawMessageContext } from "../framework/gc";
import {
    CMsgSOCacheSubscribed,
    CMsgSOCacheSubscriptionCheck,
    CMsgSOCacheSubscriptionRefresh,
    CSOEconGameAccountClient,
    CSOEconItem,
    CSOEconItemAttribute,
    CSOPersonaDataPublic,
    CMsgAdjustEquipSlots as Cs2AdjustEquipSlots,
    CMsgApplySticker as Cs2ApplySticker,
    CMsgOpenCrate as Cs2OpenCrate,
    CMsgGCCStrike15v2ClientPlayerDecalSign as Cs2PlayerDecalSign,
    Cs2ClientHello,
    Cs2ClientWelcome,
    CMsgSetItemPositions as Cs2SetItemPositions,
    Msg,
    PlayerDecalDigitalSignature,
    Proto
} from "../generated/cs2";

const SO_OWNER_STEAM_ID = 1;
const SO_ECON_ITEM = 1;
const SO_PERSONA_DATA_PUBLIC = 2;
const SO_EQUIP_SLOT = 3;
const SO_ECON_ACCOUNT = 7;
const INVENTORY_VERSION = 1n;
const FullSOMultipleObjectsProto = { name: "CMsgSOMultipleObjects" };

interface InventoryTemplate {
    readonly category?: string;
    readonly defIndex: number;
    readonly customName: string;
    readonly paintKitBits: number;
    readonly paintSeedBits: number;
    readonly paintWearBits: number;
    readonly quality: number;
    readonly rarity: number;
    readonly attributes?: readonly InventoryAttributeTemplate[];
}

interface InventoryAttributeTemplate {
    readonly defIndex: number;
    readonly valueBits: number;
}

interface InventoryContext {
    readonly steamId: bigint;
    readonly accountId: number;
    encode<TMessage>(proto: { readonly name: string }, message: TMessage): Uint8Array;
}

interface EquipmentBinding {
    readonly classId: number;
    readonly slotId: number;
    readonly itemId: bigint;
}

interface EquipmentSnapshot {
    readonly version: bigint;
    readonly items?: readonly InventoryTemplate[];
    readonly bindings: EquipmentBinding[];
    readonly positions: InventoryPosition[];
    readonly itemAttributes?: readonly ItemAttributeOverride[];
    readonly instances?: readonly InventoryInstance[];
}

interface InventoryInstance {
    readonly itemId: bigint;
    readonly templateIndex: number;
    readonly position: number;
}

interface InventoryItemReference {
    readonly itemId: bigint;
    readonly templateIndex: number;
    readonly position: number;
}

interface ItemAttributeOverride {
    readonly itemId: bigint;
    readonly defIndex: number;
    readonly valueBits: number;
}

interface InventoryPosition {
    readonly itemId: bigint;
    readonly position: number;
}

const INDIVIDUAL_STEAM_ID_BASE = 76561197960265728n;
const INDIVIDUAL_STEAM_ID_MAX = INDIVIDUAL_STEAM_ID_BASE + 4294967295n;

// These three entries keep the GC usable when CS2 is not installed on the
// server. A normal installation supplies the complete paint/weapon catalog
// parsed from items_game.txt through the host snapshot.
const FALLBACK_ITEMS: readonly InventoryTemplate[] = [
    { defIndex: 7, customName: "SKYNET AK-47", paintKitBits: 1127481344, paintSeedBits: 1134460928, paintWearBits: 1034147594, quality: 4, rarity: 6 },
    { defIndex: 9, customName: "SKYNET AWP", paintKitBits: 1135345664, paintSeedBits: 1116864512, paintWearBits: 1039516303, quality: 4, rarity: 6 },
    { defIndex: 507, customName: "SKYNET Karambit", paintKitBits: 1108869120, paintSeedBits: 1147387904, paintWearBits: 1022739087, quality: 3, rarity: 6 }
];

export function buildInventoryWelcome(
    ctx: HandlerContext<Cs2ClientHello, Cs2ClientWelcome>,
    version: number
): Cs2ClientWelcome {
    const snapshot = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    const cache = buildInventoryCache(ctx, snapshot);
    const haveVersions = ctx.request.socacheHaveVersions ?? [];
    let cacheIsCurrent = false;
    for (let i = 0; i < haveVersions.length; i++) {
        const have = haveVersions[i];
        if (have.soid?.id === ctx.steamId && have.version === snapshot.version) {
            cacheIsCurrent = true;
        }
    }

    const outofdateSubscribedCaches: CMsgSOCacheSubscribed[] = [];
    const uptodateSubscribedCaches: CMsgSOCacheSubscriptionCheck[] = [];
    if (cacheIsCurrent) {
        uptodateSubscribedCaches.push({
            version: snapshot.version,
            ownerSoid: {
                type: SO_OWNER_STEAM_ID,
                id: ctx.steamId
            }
        });
    } else {
        outofdateSubscribedCaches.push(cache);
    }

    return {
        version,
        outofdateSubscribedCaches,
        uptodateSubscribedCaches,
        rtime32GcWelcomeTimestamp: ctx.clock.now(),
        txnCountryCode: ""
    };
}

export function buildInventoryCacheForPlayer(
    ctx: RawMessageContext,
    playerSteamId: bigint
): CMsgSOCacheSubscribed {
    return buildInventoryCache(
        ctx,
        cs2Equipment(playerSteamId) as EquipmentSnapshot,
        playerSteamId,
        steamIdToAccountId(playerSteamId)
    );
}

export function isIndividualSteamId(value: bigint): boolean {
    return value >= INDIVIDUAL_STEAM_ID_BASE && value <= INDIVIDUAL_STEAM_ID_MAX;
}

export function registerInventory(): void {
    gc.onMessage(Msg.GCAdjustEquipSlotsManual, (ctx) => handleAdjustEquipSlots(ctx));
    gc.onMessage(Msg.GCAdjustEquipSlotsShuffle, (ctx) => handleAdjustEquipSlots(ctx));
    gc.onMessage(Msg.SOCacheSubscriptionRefresh, (ctx) => handleCacheRefresh(ctx));
    gc.onMessage(Msg.GCVerifyCacheSubscription, (ctx) => handleCacheVerification(ctx));
    gc.onMessage(Msg.GCSetItemPosition, (ctx) => handleLegacySetItemPosition(ctx));
    gc.onMessage(Msg.GCSetItemPositions, (ctx) => handleSetItemPositions(ctx));
    gc.onMessage(Msg.GCItemAcknowledged, (ctx) => handleItemAcknowledged(ctx));
    gc.onMessage(Msg.GCApplySticker, (ctx) => handleApplySticker(ctx));
    gc.onMessage(Msg.ClientPlayerDecalSign, (ctx) => handlePlayerDecalSign(ctx));
    gc.onMessage(Msg.GCOpenCrate, (ctx) => handleOpenCrate(ctx));
}

function handleAdjustEquipSlots(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgAdjustEquipSlots) as Cs2AdjustEquipSlots;
    const slots = request.slots ?? [];
    const current = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    const changedItemIds: bigint[] = [];
    const changedBindings: EquipmentBinding[] = [];
    let changed = false;
    ctx.logger.info("CS2 equip request: slots=" + slots.length + ", change=" + (request.changeNum ?? 0));
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const itemIdValue = slot.itemId ?? 0n;
        if (itemIdValue !== 0n && !ownsItem(current, ctx.steamId, itemIdValue)) {
            ctx.logger.info("Rejected CS2 equip request for unknown item " + itemIdValue);
            continue;
        }

        const previouslyEquipped = equippedItem(current.bindings, slot.classId ?? 0, slot.slotId ?? 0);
        addChangedItem(changedItemIds, previouslyEquipped);
        addChangedItem(changedItemIds, itemIdValue);
        cs2EquipItem(ctx.steamId, slot.classId ?? 0, slot.slotId ?? 0, itemIdValue);
        changedBindings.push({
            classId: slot.classId ?? 0,
            slotId: slot.slotId ?? 0,
            itemId: itemIdValue
        });
        changed = true;
    }

    if (!changed) {
        return;
    }

    const snapshot = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    sendItemUpdates(ctx, snapshot, changedItemIds, changedBindings);
    queueInventoryForGameServer(ctx, snapshot);
}

function handleCacheRefresh(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgSOCacheSubscriptionRefresh) as CMsgSOCacheSubscriptionRefresh;
    const requestedOwner = request.ownerSoid?.id ?? ctx.steamId;
    if (requestedOwner !== ctx.steamId) {
        ctx.logger.info("Rejected CS2 SO refresh for foreign owner " + requestedOwner);
        return;
    }

    ctx.send(
        Msg.SOCacheSubscribed,
        Proto.CMsgSOCacheSubscribed,
        buildInventoryCache(ctx, cs2Equipment(ctx.steamId) as EquipmentSnapshot)
    );
}

function handleCacheVerification(ctx: RawMessageContext): void {
    ctx.send(
        Msg.SOCacheSubscribed,
        Proto.CMsgSOCacheSubscribed,
        buildInventoryCache(ctx, cs2Equipment(ctx.steamId) as EquipmentSnapshot)
    );
}

function handleLegacySetItemPosition(ctx: RawMessageContext): void {
    // Message 1001 predates the current repeated CMsgSetItemPositions body. A
    // current CS2 client uses 1077; treating the legacy request as handled keeps
    // old clients from retrying an incompatible body indefinitely.
    ctx.logger.info("Ignored legacy CS2 SetItemPosition request");
}

function handleSetItemPositions(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgSetItemPositions) as Cs2SetItemPositions;
    const positions = request.itemPositions ?? [];
    const current = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    const changedItemIds: bigint[] = [];
    let changed = false;
    for (let i = 0; i < positions.length; i++) {
        const entry = positions[i];
        const itemIdValue = entry.itemId ?? 0n;
        if (itemIdValue === 0n || !ownsItem(current, ctx.steamId, itemIdValue)) {
            continue;
        }

        cs2SetItemPosition(ctx.steamId, itemIdValue, entry.position ?? 0);
        addChangedItem(changedItemIds, itemIdValue);
        changed = true;
    }

    if (changed) {
        sendItemUpdates(ctx, cs2Equipment(ctx.steamId) as EquipmentSnapshot, changedItemIds);
    }
}

function handleItemAcknowledged(ctx: RawMessageContext): void {
    ctx.logger.info("CS2 inventory item acknowledged");
}

function handleApplySticker(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgApplySticker) as Cs2ApplySticker;
    const sourceItemId = request.stickerItemId ?? 0n;
    const targetItemId = request.itemItemId ?? 0n;
    const current = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    const sourceIndex = inventoryIndex(current, ctx.steamId, sourceItemId);
    const targetIndex = inventoryIndex(current, ctx.steamId, targetItemId);
    const templates = inventoryItems(current);
    if (sourceIndex < 0 || targetIndex < 0) {
        ctx.logger.info("Rejected CS2 item customization for an unknown source or target item");
        return;
    }

    const source = templates[sourceIndex];
    const category = source.category ?? "";
    let sourceAttribute = 113;
    let targetAttribute = 113;
    let customizationSlot = 0;
    if (category === "keychain") {
        sourceAttribute = 299;
        targetAttribute = 299;
    } else if (category === "sticker" || category === "patch") {
        customizationSlot = request.stickerSlot ?? 0;
        if (customizationSlot < 0) {
            customizationSlot = 0;
        } else if (customizationSlot > 5) {
            customizationSlot = 5;
        }

        targetAttribute = 113 + customizationSlot * 4;
    } else {
        ctx.logger.info("Rejected unsupported CS2 customization source category " + category);
        return;
    }

    const kitId = effectiveAttribute(current, source, sourceItemId, sourceAttribute);
    if (kitId === 0) {
        ctx.logger.info("Rejected CS2 customization source without a kit attribute");
        return;
    }

    cs2SetItemAttribute(ctx.steamId, targetItemId, targetAttribute, kitId);
    if (category === "keychain") {
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, 300, request.stickerOffsetX ?? 0);
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, 301, request.stickerOffsetY ?? 0);
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, 302, request.stickerOffsetZ ?? 0);
        // Attribute 306 is the per-item keychain seed. It makes the attached
        // charm stable across inventory refreshes and match-server handoff.
        cs2SetItemAttribute(ctx.steamId, targetItemId, 306, (kitId * 2654435761) >>> 0);
    } else {
        const visualAttribute = 114 + customizationSlot * 4;
        const offsetAttribute = 278 + customizationSlot * 2;
        const wear = request.stickerWearTarget !== undefined && request.stickerWearTarget > 0
            ? request.stickerWearTarget
            : request.stickerWear ?? 0;
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, visualAttribute, wear);
        if (request.stickerScale !== undefined && request.stickerScale > 0) {
            cs2SetItemFloatAttribute(ctx.steamId, targetItemId, visualAttribute + 1, request.stickerScale);
        }
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, visualAttribute + 2, request.stickerRotation ?? 0);
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, offsetAttribute, request.stickerOffsetX ?? 0);
        cs2SetItemFloatAttribute(ctx.steamId, targetItemId, offsetAttribute + 1, request.stickerOffsetY ?? 0);
    }

    const updated = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    sendItemUpdates(ctx, updated, [targetItemId]);
    const notificationRequest = category === "keychain"
        ? 1091
        : category === "patch" ? 1090 : 1086;
    ctx.send(Msg.GCItemCustomizationNotification, Proto.CMsgGCItemCustomizationNotification, {
        itemId: [targetItemId, sourceItemId],
        request: notificationRequest,
        extraData: []
    });
    queueInventoryForGameServer(ctx, updated);
    ctx.logger.info(
        "Applied CS2 " + category + " kit=" + kitId + " to item=" + targetItemId +
            " attribute=" + targetAttribute
    );
}

function handleOpenCrate(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgOpenCrate) as Cs2OpenCrate;
    const current = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    const subjectId = request.subjectItemId ?? 0n;
    const subjectIndex = inventoryIndex(current, ctx.steamId, subjectId);
    const templates = inventoryItems(current);
    if (subjectIndex < 0) {
        ctx.logger.info("Rejected CS2 open-container request for an unknown item");
        return;
    }

    const category = templates[subjectIndex].category ?? "";
    let rewardCategory = "case_reward";
    if (category === "sticker_capsule") {
        rewardCategory = "sticker";
    } else if (category === "graffiti_box") {
        rewardCategory = "graffiti";
    }

    const rewardId = cs2CreateRandomInventoryItem(ctx.steamId, rewardCategory);
    if (rewardId === 0n) {
        ctx.logger.info("Rejected CS2 open-container request without a local reward category");
        return;
    }

    const updated = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    sendItemAdds(ctx, updated, [rewardId]);
    const rewardReference = inventoryReference(updated, ctx.steamId, rewardId);
    const updatedTemplates = inventoryItems(updated);
    let rewardTemplateCategory = "unknown";
    let rewardTemplateDefIndex = 0;
    if (rewardReference !== undefined) {
        const rewardTemplate = updatedTemplates[rewardReference.templateIndex];
        rewardTemplateCategory = rewardTemplate.category ?? "unknown";
        rewardTemplateDefIndex = rewardTemplate.defIndex;
    }
    ctx.send(Msg.GCItemCustomizationNotification, Proto.CMsgGCItemCustomizationNotification, {
        // The reveal UI treats the first id as the acquired item. Returning
        // the container first makes it reveal the crate instead of the SO add.
        itemId: [rewardId, subjectId],
        request: 1007,
        extraData: [request.toolItemId ?? 0n]
    });
    ctx.logger.info(
        "Opened local CS2 " + category + " item=" + subjectId + " reward=" + rewardId +
            " category=" + rewardTemplateCategory +
            " defIndex=" + rewardTemplateDefIndex
    );
}

function handlePlayerDecalSign(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgGCCStrike15v2ClientPlayerDecalSign) as Cs2PlayerDecalSign;
    const sprayItemId = request.itemid ?? 0n;
    const current = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    const sprayIndex = inventoryIndex(current, ctx.steamId, sprayItemId);
    const templates = inventoryItems(current);
    if (sprayIndex < 0 || templates[sprayIndex].category !== "graffiti") {
        ctx.logger.info("Rejected CS2 graffiti signature for an unknown spray item");
        return;
    }

    const spray = templates[sprayIndex];
    const kitId = effectiveAttribute(current, spray, sprayItemId, 113);
    const tintId = effectiveAttribute(current, spray, sprayItemId, 233);
    const remaining = effectiveAttribute(current, spray, sprayItemId, 232);
    if (kitId === 0 || remaining === 0) {
        ctx.logger.info("Rejected exhausted or invalid CS2 graffiti item " + sprayItemId);
        return;
    }

    const data: PlayerDecalDigitalSignature = request.data === undefined ? {} : request.data;
    const traceId = data.traceId ?? 0;
    const signedData: PlayerDecalDigitalSignature = {
        signature: createGraffitiSignature(ctx.accountId, kitId, traceId),
        accountid: ctx.accountId,
        // The recorded Valve exchange advances request.rtime by one second.
        rtime: data.rtime !== undefined && data.rtime !== 0 ? data.rtime + 1 : ctx.clock.now(),
        endpos: data.endpos ?? [],
        startpos: data.startpos ?? [],
        left: data.left ?? [],
        txDefidx: data.txDefidx !== undefined && data.txDefidx !== 0 ? data.txDefidx : kitId,
        entindex: data.entindex ?? 0,
        hitbox: data.hitbox ?? 0,
        creationtime: data.creationtime ?? 0,
        equipslot: data.equipslot ?? 0,
        traceId,
        normal: data.normal ?? [],
        tintId: data.tintId !== undefined && data.tintId !== 0 ? data.tintId : tintId
    };
    const response: Cs2PlayerDecalSign = { data: signedData, itemid: sprayItemId };
    const encoded = ctx.encode(Proto.CMsgGCCStrike15v2ClientPlayerDecalSign, response);

    // The client needs the signed trace immediately; the match server receives
    // the identical body so listen and dedicated LAN matches accept the decal.
    ctx.send(Msg.ClientPlayerDecalSign, Proto.CMsgGCCStrike15v2ClientPlayerDecalSign, response);
    const queued = cs2QueueGameServerMessage(Msg.ClientPlayerDecalSign, encoded);

    cs2SetItemAttribute(ctx.steamId, sprayItemId, 232, remaining - 1);
    const updated = cs2Equipment(ctx.steamId) as EquipmentSnapshot;
    sendItemUpdates(ctx, updated, [sprayItemId]);
    ctx.logger.info(
        "Signed CS2 graffiti kit=" + kitId + " trace=" + traceId + " queued=" + queued
    );
}

function effectiveAttribute(
    snapshot: EquipmentSnapshot,
    template: InventoryTemplate,
    id: bigint,
    defIndex: number
): number {
    const overrides = snapshot.itemAttributes ?? [];
    for (let i = 0; i < overrides.length; i++) {
        if (overrides[i].itemId === id && overrides[i].defIndex === defIndex) {
            return overrides[i].valueBits;
        }
    }

    const attributes = template.attributes ?? [];
    for (let i = 0; i < attributes.length; i++) {
        if (attributes[i].defIndex === defIndex) {
            return attributes[i].valueBits;
        }
    }

    return 0;
}

function createGraffitiSignature(accountId: number, kitId: number, traceId: number): Uint8Array {
    const result = new Uint8Array(128);
    let state = (accountId ^ kitId ^ traceId ^ 0x534b594e) >>> 0;
    for (let i = 0; i < result.length; i++) {
        state = (state * 1664525 + 1013904223) >>> 0;
        result[i] = (state >>> ((i & 3) * 8)) & 0xff;
    }

    return result;
}

function sendItemUpdates(
    ctx: RawMessageContext,
    snapshot: EquipmentSnapshot,
    itemIds: readonly bigint[],
    bindings: readonly EquipmentBinding[] = []
): void {
    const objectsModified = [];
    const templates = inventoryItems(snapshot);
    for (let i = 0; i < itemIds.length; i++) {
        const reference = inventoryReference(snapshot, ctx.steamId, itemIds[i]);
        if (reference === undefined || reference.templateIndex >= templates.length) {
            continue;
        }

        objectsModified.push({
            typeId: SO_ECON_ITEM,
            objectData: ctx.encode(
                Proto.CSOEconItem,
                buildItem(ctx, templates[reference.templateIndex], reference.position, snapshot, ctx.steamId, ctx.accountId, reference.itemId)
            )
        });
    }

    // Current CS2 consumes the explicit type-3 equip-slot SO in addition to
    // CSOEconItem.equipped_state. Without this object the loadout screen keeps
    // retrying message 2531 and the selected item is not used by a match.
    for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        objectsModified.push({
            typeId: SO_EQUIP_SLOT,
            objectData: ctx.encode(Proto.CSOEconEquipSlot, {
                accountId: ctx.accountId,
                classId: binding.classId,
                slotId: binding.slotId,
                itemId: binding.itemId
            })
        });
    }

    if (objectsModified.length === 0) {
        return;
    }

    ctx.send(Msg.SOMultipleObjects, Proto.CMsgSOMultipleObjects, {
        objectsModified,
        version: snapshot.version,
        ownerSoid: {
            type: SO_OWNER_STEAM_ID,
            id: ctx.steamId
        }
    });
}

function sendItemAdds(ctx: RawMessageContext, snapshot: EquipmentSnapshot, itemIds: readonly bigint[]): void {
    const objectsAdded = [];
    const templates = inventoryItems(snapshot);
    for (let i = 0; i < itemIds.length; i++) {
        const reference = inventoryReference(snapshot, ctx.steamId, itemIds[i]);
        if (reference === undefined || reference.templateIndex >= templates.length) {
            continue;
        }

        objectsAdded.push({
            typeId: SO_ECON_ITEM,
            objectData: ctx.encode(
                Proto.CSOEconItem,
                buildItem(ctx, templates[reference.templateIndex], reference.position, snapshot, ctx.steamId, ctx.accountId, reference.itemId)
            )
        });
    }

    if (objectsAdded.length === 0) {
        return;
    }

    ctx.send(Msg.SOMultipleObjects, FullSOMultipleObjectsProto, {
        objectsAdded,
        version: snapshot.version,
        ownerSoid: {
            type: SO_OWNER_STEAM_ID,
            id: ctx.steamId
        }
    });
}

function queueInventoryForGameServer(ctx: RawMessageContext, snapshot: EquipmentSnapshot): void {
    // When a player enters a match CS2 repeats message 2531 with the complete
    // loadout. The client-side SO update alone is not authoritative for the
    // dedicated/listen server: it also needs the player's owner cache in order
    // to resolve item IDs, paint attributes and equipped_state while spawning
    // weapons. Queue the same cache to the SteamID registered by message 4007.
    const queued = cs2QueueGameServerMessage(
        Msg.SOCacheSubscribed,
        ctx.encode(Proto.CMsgSOCacheSubscribed, buildInventoryCache(ctx, snapshot))
    );
    ctx.logger.info(
        "CS2 player loadout queued for game server: steamId=" + ctx.steamId +
            " version=" + snapshot.version + " queued=" + queued
    );
}

function buildInventoryCache(
    ctx: InventoryContext,
    snapshot: EquipmentSnapshot,
    ownerSteamId: bigint = ctx.steamId,
    ownerAccountId: number = ctx.accountId
): CMsgSOCacheSubscribed {
    const itemObjects: Uint8Array[] = [];
    const templates = inventoryItems(snapshot);
    for (let i = 0; i < templates.length; i++) {
        itemObjects.push(
            ctx.encode(
                Proto.CSOEconItem,
                buildItem(ctx, templates[i], i + 1, snapshot, ownerSteamId, ownerAccountId)
            )
        );
    }
    const instances = snapshot.instances ?? [];
    for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        if (instance.templateIndex < 0 || instance.templateIndex >= templates.length) {
            continue;
        }

        itemObjects.push(
            ctx.encode(
                Proto.CSOEconItem,
                buildItem(
                    ctx,
                    templates[instance.templateIndex],
                    instance.position,
                    snapshot,
                    ownerSteamId,
                    ownerAccountId,
                    instance.itemId
                )
            )
        );
    }

    // Current CS2 assigns SO type 2 to the public persona and type 7 to the
    // econ account. Sending the account body as type 2 looks superficially
    // valid protobuf, but makes the client deserialize it as a level-zero
    // persona and reject the inventory cache.
    const personaObject = ctx.encode<CSOPersonaDataPublic>(Proto.CSOPersonaDataPublic, {
        playerLevel: 1,
        elevatedState: true
    });
    const accountObject = ctx.encode<CSOEconGameAccountClient>(Proto.CSOEconGameAccountClient, {
        additionalBackpackSlots: 0,
        elevatedState: 1
    });
    const equipObjects: Uint8Array[] = [];
    for (let i = 0; i < snapshot.bindings.length; i++) {
        const binding = snapshot.bindings[i];
        equipObjects.push(ctx.encode(Proto.CSOEconEquipSlot, {
                accountId: ownerAccountId,
            classId: binding.classId,
            slotId: binding.slotId,
            itemId: binding.itemId
        }));
    }

    return {
        objects: [
            {
                typeId: SO_ECON_ITEM,
                objectData: itemObjects
            },
            {
                typeId: SO_PERSONA_DATA_PUBLIC,
                objectData: [personaObject]
            },
            {
                typeId: SO_EQUIP_SLOT,
                objectData: equipObjects
            },
            {
                typeId: SO_ECON_ACCOUNT,
                objectData: [accountObject]
            }
        ],
        version: snapshot.version ?? INVENTORY_VERSION,
        ownerSoid: {
            type: SO_OWNER_STEAM_ID,
            id: ownerSteamId
        }
    };
}

function buildItem(
    ctx: InventoryContext,
    template: InventoryTemplate,
    position: number,
    snapshot: EquipmentSnapshot,
    ownerSteamId: bigint = ctx.steamId,
    ownerAccountId: number = ctx.accountId,
    explicitItemId?: bigint
): CSOEconItem {
    const attributes: CSOEconItemAttribute[] = [];
    const importedAttributes = template.attributes ?? [];
    if (importedAttributes.length > 0) {
        for (let i = 0; i < importedAttributes.length; i++) {
            attributes.push({
                defIndex: importedAttributes[i].defIndex,
                valueBytes: uint32Bytes(importedAttributes[i].valueBits)
            });
        }
    } else if (template.paintKitBits !== 0) {
        // Fallback templates and older host snapshots still expose the three
        // paint fields directly. All current schema items use attributes[].
        attributes.push({ defIndex: 6, valueBytes: uint32Bytes(template.paintKitBits) });
        attributes.push({ defIndex: 7, valueBytes: uint32Bytes(template.paintSeedBits) });
        attributes.push({ defIndex: 8, valueBytes: uint32Bytes(template.paintWearBits) });
    }

    const id = explicitItemId ?? itemId(ownerSteamId, position);
    applyItemAttributeOverrides(attributes, snapshot.itemAttributes ?? [], id);
    const equippedState = [];
    for (let i = 0; i < snapshot.bindings.length; i++) {
        const binding = snapshot.bindings[i];
        if (binding.itemId === id) {
            equippedState.push({
                newClass: binding.classId,
                newSlot: binding.slotId
            });
        }
    }

    return {
        id,
        accountId: ownerAccountId,
        inventory: savedPosition(snapshot.positions, id, position),
        defIndex: template.defIndex,
        quantity: 1,
        level: 1,
        quality: template.quality,
        flags: 0,
        origin: 8,
        customName: template.customName,
        attribute: attributes,
        inUse: false,
        style: 0,
        originalId: 0n,
        equippedState,
        rarity: template.rarity
    };
}

function applyItemAttributeOverrides(
    attributes: CSOEconItemAttribute[],
    overrides: readonly ItemAttributeOverride[],
    id: bigint
): void {
    for (let i = 0; i < overrides.length; i++) {
        const override = overrides[i];
        if (override.itemId !== id) {
            continue;
        }

        let replaced = false;
        for (let j = 0; j < attributes.length; j++) {
            if (attributes[j].defIndex === override.defIndex) {
                attributes[j] = {
                    defIndex: override.defIndex,
                    valueBytes: uint32Bytes(override.valueBits)
                };
                replaced = true;
                break;
            }
        }

        if (!replaced) {
            attributes.push({
                defIndex: override.defIndex,
                valueBytes: uint32Bytes(override.valueBits)
            });
        }
    }
}

function uint32Bytes(value: number): Uint8Array {
    return new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff
    ]);
}

function savedPosition(positions: readonly InventoryPosition[], id: bigint, fallback: number): number {
    for (let i = 0; i < positions.length; i++) {
        if (positions[i].itemId === id) {
            return positions[i].position;
        }
    }

    return fallback;
}

function inventoryItems(snapshot: EquipmentSnapshot): readonly InventoryTemplate[] {
    const imported = snapshot.items ?? [];
    return imported.length > 0 ? imported : FALLBACK_ITEMS;
}

function ownsItem(snapshot: EquipmentSnapshot, steamIdValue: bigint, candidate: bigint): boolean {
    return inventoryReference(snapshot, steamIdValue, candidate) !== undefined;
}

function inventoryIndex(snapshot: EquipmentSnapshot, steamIdValue: bigint, candidate: bigint): number {
    const reference = inventoryReference(snapshot, steamIdValue, candidate);
    return reference === undefined ? -1 : reference.templateIndex;
}

function inventoryReference(
    snapshot: EquipmentSnapshot,
    steamIdValue: bigint,
    candidate: bigint
): InventoryItemReference | undefined {
    const templates = inventoryItems(snapshot);
    for (let i = 0; i < templates.length; i++) {
        if (itemId(steamIdValue, i + 1) === candidate) {
            return { itemId: candidate, templateIndex: i, position: i + 1 };
        }
    }

    const instances = snapshot.instances ?? [];
    for (let i = 0; i < instances.length; i++) {
        if (instances[i].itemId === candidate) {
            return {
                itemId: candidate,
                templateIndex: instances[i].templateIndex,
                position: instances[i].position
            };
        }
    }

    return undefined;
}

function equippedItem(bindings: readonly EquipmentBinding[], classId: number, slotId: number): bigint {
    for (let i = 0; i < bindings.length; i++) {
        if (bindings[i].classId === classId && bindings[i].slotId === slotId) {
            return bindings[i].itemId;
        }
    }

    return 0n;
}

function addChangedItem(items: bigint[], itemIdValue: bigint): void {
    if (itemIdValue === 0n) {
        return;
    }

    for (let i = 0; i < items.length; i++) {
        if (items[i] === itemIdValue) {
            return;
        }
    }

    items.push(itemIdValue);
}

function itemId(steamIdValue: bigint, position: number): bigint {
    const stablePosition = BigInt(position & 0xffff);
    return 0x7300000000000000n | ((steamIdValue & 0xffffffffn) << 16n) | stablePosition;
}

function steamIdToAccountId(steamIdValue: bigint): number {
    if (!isIndividualSteamId(steamIdValue)) {
        return 0;
    }

    return Number(steamIdValue - INDIVIDUAL_STEAM_ID_BASE);
}
