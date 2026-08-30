// Deadlock still has capture-backed legacy modules. This structural route
// shape lets main.ts adopt generated routes incrementally without changing
// their proven payload builders in the same patch.
export interface Route {
    readonly requestId: number;
    readonly request: any;
    readonly responseId: number;
    readonly response: any;
}

export interface Clock {
    now(): number;
}

export interface Logger {
    info(message: string): void;
}

export interface DeadlockBuildService {
    recordClientVersion(accountId: number, version: number): number;
    clientVersion(accountId?: number): number;
}

export interface GcServices {
    readonly build: DeadlockBuildService;
}

export interface HandlerContext<TRequest = any, TResponse = any> {
    readonly route: Route;
    readonly request: TRequest;
    readonly steamId: bigint;
    readonly accountId: number;
    readonly personaName: string;
    readonly services: GcServices;
    readonly clock: Clock;
    readonly logger: Logger;
    reply(response: any): void;
    send(messageType: number, proto: any, message: any): void;
    encode(proto: any, message: any): Uint8Array;
}

export interface RawMessageContext {
    readonly messageType: number;
    readonly payload: Uint8Array;
    readonly steamId: bigint;
    readonly accountId: number;
    readonly personaName: string;
    readonly services: GcServices;
    readonly clock: Clock;
    readonly logger: Logger;
    reply(messageType: number, proto: any, message: any): void;
    send(messageType: number, proto: any, message: any): void;
    encode(proto: any, message: any): Uint8Array;
    decode(proto: any): any;
}

class GcClock implements Clock {
    now(): number {
        return now();
    }
}

class GcLogger implements Logger {
    info(message: string): void {
        log(message);
    }
}

class GcDeadlockBuildService implements DeadlockBuildService {
    recordClientVersion(accountId: number, version: number): number {
        return deadlockRecordClientVersion(accountId, version);
    }

    clientVersion(accountId: number = 0): number {
        return deadlockClientVersion(accountId);
    }
}

class GcServiceContainer implements GcServices {
    build: DeadlockBuildService;

    constructor() {
        this.build = new GcDeadlockBuildService();
    }
}

export const deadlockServices: GcServices = new GcServiceContainer();

function resolveProtoName(proto: any): string {
    if (typeof proto === "string") {
        return proto;
    }
    return proto.name;
}

class GcHandlerContext implements HandlerContext<any, any> {
    route: Route;
    request: any;
    steamId: bigint;
    accountId: number;
    personaName: string;
    services: GcServices;
    clock: Clock;
    logger: Logger;

    constructor(route: Route) {
        this.route = route;
        const requestBody = body();
        this.request = route.request.name === "__SKYNET_RAW_PROTO__"
            ? requestBody
            : decode(route.request.name, requestBody);
        this.steamId = steamId();
        this.accountId = accountId();
        this.personaName = personaName();
        this.services = deadlockServices;
        this.clock = new GcClock();
        this.logger = new GcLogger();
    }

    reply(response: any): void {
        reply(
            this.route.responseId,
            encode(this.route.response.name, response),
            true
        );
    }

    send(targetMessageType: number, proto: any, message: any): void {
        send(targetMessageType, encode(resolveProtoName(proto), message), true);
    }

    encode(proto: any, message: any): Uint8Array {
        return encode(resolveProtoName(proto), message);
    }
}

class GcRawMessageContext implements RawMessageContext {
    messageType: number;
    payload: Uint8Array;
    steamId: bigint;
    accountId: number;
    personaName: string;
    services: GcServices;
    clock: Clock;
    logger: Logger;

    constructor(currentMessageType: number) {
        this.messageType = currentMessageType;
        this.payload = body();
        this.steamId = steamId();
        this.accountId = accountId();
        this.personaName = personaName();
        this.services = deadlockServices;
        this.clock = new GcClock();
        this.logger = new GcLogger();
    }

    reply(targetMessageType: number, proto: any, message: any): void {
        reply(targetMessageType, encode(resolveProtoName(proto), message), true);
    }

    send(targetMessageType: number, proto: any, message: any): void {
        send(targetMessageType, encode(resolveProtoName(proto), message), true);
    }

    encode(proto: any, message: any): Uint8Array {
        return encode(resolveProtoName(proto), message);
    }

    decode(proto: any): any {
        return decode(resolveProtoName(proto), this.payload);
    }
}

const emptyRoute: Route = {
    requestId: 0,
    responseId: 0,
    request: { name: "" },
    response: { name: "" }
};

class GcRouter {
    handlers: Map<number, any>;

    constructor() {
        this.handlers = new Map<number, any>();
    }

    on(route: Route, handler: any): void {
        this.register({
            messageId: route.requestId,
            raw: false,
            route: route,
            handler: handler,
            source: route.request.name
        });
    }

    onMessage(messageId: number, handler: any): void {
        this.register({
            messageId: messageId,
            raw: true,
            route: emptyRoute,
            handler: handler,
            source: "raw message " + messageId
        });
    }

    dispatch(): boolean {
        const current = messageType();
        if (!this.handlers.has(current)) {
            return false;
        }

        const registration = this.handlers.get(current);
        try {
            const result = registration.raw
                ? registration.handler(new GcRawMessageContext(current))
                : registration.handler(new GcHandlerContext(registration.route));
            return result !== false;
        }
        catch (error) {
            log(
                "Deadlock GC handler failed. messageId=" +
                    current +
                    " source=" +
                    registration.source +
                    " steamId=" +
                    steamId() +
                    " error=" +
                    String(error)
            );
            throw error;
        }
    }

    private register(registration: any): void {
        if (
            !registration.raw &&
            (
                registration.route.request.name == undefined ||
                registration.route.response.name == undefined
            )
        ) {
            throw new Error(
                "Deadlock GC route has an empty protobuf descriptor for message " +
                    registration.messageId
            );
        }

        if (this.handlers.has(registration.messageId)) {
            const existing = this.handlers.get(registration.messageId);
            throw (
                "Duplicate Deadlock GC handler for message " +
                    registration.messageId +
                    " existing=" +
                    existing.source +
                    " incoming=" +
                    registration.source
            );
        }
        this.handlers.set(registration.messageId, registration);
    }
}

export function encodeProto(protoName: string, value: any): Uint8Array {
    return encode(protoName, value);
}

export const gc = new GcRouter();
