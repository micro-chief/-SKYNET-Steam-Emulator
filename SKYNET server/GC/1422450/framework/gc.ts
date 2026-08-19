export interface HandlerContext {
    request: any;
    steamId: bigint;
    accountId: number;

    reply(response: any): void;
    send(messageType: number, protoName: string, response: any): void;
}

export interface Route {
    requestId: number;
    request: any;
    responseId: number;
    response: any;
}

class GcHandlerContext implements HandlerContext {
    request: any;
    steamId: bigint;
    accountId: number;
    route: Route;

    constructor(route: Route) {
        this.route = route;
        this.request = decode(route.request.name, body());
        this.steamId = steamId();
        this.accountId = accountId();
    }

    reply(response: any): void {
        const data = encode(this.route.response.name, response);
        reply(this.route.responseId, data, true);
    }

    send(messageType: number, protoName: string, response: any): void {
        const data = encode(protoName, response);
        send(messageType, data, true);
    }
}

class GcRouter {
    handlers: Map<number, any>;

    constructor() {
        this.handlers = new Map<number, any>();
    }

    on(route: Route, handler: any): void {
    log("GC register route=" + route.requestId);

    this.handlers.set(route.requestId, {
        route: route,
        handler: handler
    });
    
    }

    dispatch(): boolean {
    const id = messageType();

    log(
        "GC dispatch id=" +
        id +
        " handlers=" +
        this.handlers.size
    );

    const registered = this.handlers.get(id);

    if (!registered) {
        log("GC no handler for id=" + id);
        return false;
    }

    log(
        "GC handler found for id=" +
        id
    );

    const ctx =
        new GcHandlerContext(
            registered.route
        );

    registered.handler(ctx);

    return true;
    }
}

export function encodeProto(
    protoName: string,
    value: any
): any {
    return encode(protoName, value);
}

export const gc = new GcRouter();
