declare global {
    function messageType(): number;
    function body(): Uint8Array;
    function now(): number;
    function steamId(): bigint;
    function accountId(): number;
    function personaName(): string;
    function decode<TMessage = unknown>(typeName: string, payload: Uint8Array): TMessage;
    function encode<TMessage = unknown>(typeName: string, value: TMessage): Uint8Array;
    function send(messageType: number, payload: Uint8Array, protobuf?: boolean): boolean;
    function reply(messageType: number, payload: Uint8Array, protobuf?: boolean): boolean;
    function log(message: string): void;
    function cs2LanReservation(gameType: number, clientVersion: number): Cs2LanReservation | null;
    function cs2Equipment(steamId: bigint): unknown;
    function cs2EquipItem(steamId: bigint, classId: number, slotId: number, itemId: bigint): bigint;
    function cs2SetItemPosition(steamId: bigint, itemId: bigint, position: number): bigint;
    function cs2SetItemAttribute(steamId: bigint, itemId: bigint, defIndex: number, valueBits: number): bigint;
    function cs2SetItemFloatAttribute(steamId: bigint, itemId: bigint, defIndex: number, value: number): bigint;
    function cs2CreateRandomInventoryItem(steamId: bigint, category: string): bigint;
    function cs2ActivateLanReservation(
        reservation: Cs2LanReservation,
        gameType: number,
        serverVersion: number,
        accountIds: number[]
    ): boolean;
    function cs2OngoingReservation(accountId: number): unknown;
    function cs2ConfirmReservation(reservationId: bigint): boolean;
    function cs2ClearReservation(accountId: number): boolean;
    function cs2FinishReservation(reservationId: bigint): Cs2FinishedReservation | null;
    function cs2QueueClientMessage(steamId: bigint, messageType: number, payload: Uint8Array): boolean;
    function cs2QueueGameServerMessage(messageType: number, payload: Uint8Array): boolean;
    function cs2RegisterGameServer(version: number): Cs2GameServerRegistration;
}

interface Cs2LanReservation {
    readonly serverId: bigint;
    readonly matchId: bigint;
    readonly reservationId: bigint;
    readonly directUdpIp: number;
    readonly directUdpPort: number;
    readonly serverAddress: string;
    readonly map: string;
}

interface Cs2GameServerRegistration {
    readonly serverId: bigint;
    readonly sessionSteamId: bigint;
    readonly serverAddress: string;
    readonly port: number;
    readonly version: number;
    readonly registeredAt: number;
}

interface Cs2InventoryCatalogItem {
    readonly defIndex: number;
    readonly customName: string;
    readonly paintKitBits: number;
    readonly paintSeedBits: number;
    readonly paintWearBits: number;
    readonly quality: number;
    readonly rarity: number;
    readonly category: string;
    readonly attributes: Cs2InventoryCatalogAttribute[];
}

interface Cs2InventoryCatalogAttribute {
    readonly defIndex: number;
    readonly valueBits: number;
}

interface Cs2ItemAttributeOverride {
    readonly itemId: bigint;
    readonly defIndex: number;
    readonly valueBits: number;
}

interface Cs2ActiveReservation {
    readonly serverId: bigint;
    readonly matchId: bigint;
    readonly reservationId: bigint;
    readonly directUdpIp: number;
    readonly directUdpPort: number;
    readonly serverAddress: string;
    readonly map: string;
    readonly gameType: number;
    readonly serverVersion: number;
    readonly state: number;
    readonly accountIds: number[];
}

interface Cs2ReservationPlayer {
    readonly accountId: number;
    readonly steamId: bigint;
}

interface Cs2FinishedReservation {
    readonly reservationId: bigint;
    readonly serverId: bigint;
    readonly matchId: bigint;
    readonly players: Cs2ReservationPlayer[];
}

export {};
