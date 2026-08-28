import { GcRoute, ProtoDescriptor } from "../generated/cs2";

export type HandlerResult = void | boolean | Promise<void | boolean>;
export type RouteHandler<TRequest, TResponse> = (ctx: HandlerContext<TRequest, TResponse>) => HandlerResult;
export type RawMessageHandler = (ctx: RawMessageContext) => HandlerResult;

export interface Clock {
    now(): number;
}

export interface Logger {
    info(message: string): void;
}

export interface HandlerContext<TRequest, TResponse> {
    readonly route: GcRoute<TRequest, TResponse>;
    readonly request: TRequest;
    readonly steamId: bigint;
    readonly accountId: number;
    readonly personaName: string;
    readonly clock: Clock;
    readonly logger: Logger;
    reply(response: TResponse): void;
    send<TMessage>(messageType: number, proto: ProtoDescriptor<TMessage>, message: TMessage): void;
    encode<TMessage>(proto: ProtoDescriptor<TMessage>, message: TMessage): Uint8Array;
}

export interface RawMessageContext {
    readonly messageType: number;
    readonly payload: Uint8Array;
    readonly steamId: bigint;
    readonly accountId: number;
    readonly personaName: string;
    readonly clock: Clock;
    readonly logger: Logger;
    reply<TMessage>(messageType: number, proto: ProtoDescriptor<TMessage>, message: TMessage): void;
    send<TMessage>(messageType: number, proto: ProtoDescriptor<TMessage>, message: TMessage): void;
    encode<TMessage>(proto: ProtoDescriptor<TMessage>, message: TMessage): Uint8Array;
    decode<TMessage>(proto: ProtoDescriptor<TMessage>): TMessage;
}

class GcClock implements Clock {
    now(): number {
        return now() as number;
    }
}

class GcLogger implements Logger {
    info(message: string): void {
        log(message);
    }
}

class GcHandlerContext<TRequest, TResponse> implements HandlerContext<TRequest, TResponse> {
    route: GcRoute<TRequest, TResponse>;
    request: TRequest;
    steamId: bigint;
    accountId: number;
    personaName: string;
    clock: Clock;
    logger: Logger;

    constructor(route: GcRoute<TRequest, TResponse>) {
        this.route = route;
        this.request = decode(route.request.name, body()) as TRequest;
        this.steamId = steamId();
        this.accountId = accountId();
        this.personaName = personaName();
        this.clock = new GcClock();
        this.logger = new GcLogger();
    }

    reply(response: TResponse): void {
        reply(this.route.responseId, encode(this.route.response.name, response), true);
    }

    send<TMessage>(messageType: number, proto: ProtoDescriptor<TMessage>, message: TMessage): void {
        send(messageType, encode(proto.name, message), true);
    }

    encode<TMessage>(proto: ProtoDescriptor<TMessage>, message: TMessage): Uint8Array {
        return encode(proto.name, message);
    }
}

class GcRawMessageContext implements RawMessageContext {
    messageType: number;
    payload: Uint8Array;
    steamId: bigint;
    accountId: number;
    personaName: string;
    clock: Clock;
    logger: Logger;

    constructor(currentMessageType: number) {
        this.messageType = currentMessageType;
        this.payload = body();
        this.steamId = steamId();
        this.accountId = accountId();
        this.personaName = personaName();
        this.clock = new GcClock();
        this.logger = new GcLogger();
    }

    reply<TMessage>(messageType: number, proto: ProtoDescriptor<TMessage>, message: TMessage): void {
        reply(messageType, encode(proto.name, message), true);
    }

    send<TMessage>(messageType: number, proto: ProtoDescriptor<TMessage>, message: TMessage): void {
        send(messageType, encode(proto.name, message), true);
    }

    encode<TMessage>(proto: ProtoDescriptor<TMessage>, message: TMessage): Uint8Array {
        return encode(proto.name, message);
    }

    decode<TMessage>(proto: ProtoDescriptor<TMessage>): TMessage {
        return decode(proto.name, this.payload) as TMessage;
    }
}

const emptyProto: ProtoDescriptor<unknown> = { name: "" };
const emptyRoute: GcRoute<unknown, unknown> = {
    requestId: 0,
    responseId: 0,
    request: emptyProto,
    response: emptyProto
};
const unregisteredRouteHandler: RouteHandler<unknown, unknown> = () => false;
const unregisteredRawHandler: RawMessageHandler = () => false;

interface RegisteredHandler {
    readonly messageId: number;
    readonly raw: boolean;
    readonly route: GcRoute<unknown, unknown>;
    readonly routeHandler: RouteHandler<unknown, unknown>;
    readonly rawHandler: RawMessageHandler;
    readonly source: string;
}

class GcRouter {
    handlers: Map<number, RegisteredHandler>;

    constructor() {
        this.handlers = new Map<number, RegisteredHandler>();
    }

    on<TRequest, TResponse>(route: GcRoute<TRequest, TResponse>, handler: RouteHandler<TRequest, TResponse>): void {
        this.register({
            messageId: route.requestId,
            raw: false,
            route: route as GcRoute<unknown, unknown>,
            routeHandler: handler as RouteHandler<unknown, unknown>,
            rawHandler: unregisteredRawHandler,
            source: route.request.name
        });
    }

    onMessage(messageId: number, handler: RawMessageHandler): void {
        this.register({
            messageId,
            raw: true,
            route: emptyRoute,
            routeHandler: unregisteredRouteHandler,
            rawHandler: handler,
            source: "raw message " + messageId
        });
    }

    async dispatch(): Promise<boolean> {
        const current = messageType();
        if (!this.handlers.has(current)) {
            return false;
        }
        const registration = this.handlers.get(current) as RegisteredHandler;

        try {
            const result = registration.raw
                ? registration.rawHandler(new GcRawMessageContext(current))
                : registration.routeHandler(new GcHandlerContext(registration.route));
            return (await result) !== false;
        } catch (error) {
            log(
                "CS2 GC handler failed. messageId=" +
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

    private register(registration: RegisteredHandler): void {
        if (this.handlers.has(registration.messageId)) {
            throw new Error("Duplicate CS2 GC handler for message " + registration.messageId);
        }
        this.handlers.set(registration.messageId, registration);
    }
}

export const gc = new GcRouter();
