import { HandlerContext } from "../framework/gc";

import {
    CMsgClientHello,
    CMsgClientWelcome,
    GcRoute,
    ProtoDescriptor,
} from "../generated/protobuf";

const requestProto = {
    name: "CMsgClientHello",
} as ProtoDescriptor<CMsgClientHello>;

const responseProto = {
    name: "CMsgClientWelcome",
} as ProtoDescriptor<CMsgClientWelcome>;

export const RequestGameServerHelloRoute = {
    requestId: 4007,
    request: requestProto,
    responseId: 4005,
    response: responseProto,
} as GcRoute<
    CMsgClientHello,
    CMsgClientWelcome
>;

export function requestGameServerHello(
    ctx: HandlerContext<
        CMsgClientHello,
        CMsgClientWelcome
    >,
): boolean {
    ctx.reply({
        version: ctx.request.version ?? 1,
    });

    return true;
}