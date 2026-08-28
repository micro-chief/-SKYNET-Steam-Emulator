import { gc, RawMessageContext } from "../framework/gc";
import {
    CMsgGCCStrike15v2Server2GCClientValidate,
    Cs2ServerHello,
    Msg,
    Proto
} from "../generated/cs2";
import { buildInventoryCacheForPlayer, isIndividualSteamId } from "./Inventory";

export function registerServer(): void {
    gc.onMessage(Msg.GCGameServerHello, (ctx) => {
        const request = ctx.decode(Proto.Cs2ServerHello) as Cs2ServerHello;
        const version = request.version ?? 0;
        const registration = cs2RegisterGameServer(version);

        // The listen server stops polling the asynchronous GC channel after it
        // consumes 4005. Carry the authenticated local player's cache in that
        // immediate response so cosmetics exist before weapons are spawned.
        const playerCaches = isIndividualSteamId(registration.sessionSteamId)
            ? [buildInventoryCacheForPlayer(ctx, registration.sessionSteamId)]
            : [];
        ctx.reply(Msg.GCGameServerWelcome, Proto.Cs2ClientWelcome, {
            version,
            outofdateSubscribedCaches: playerCaches,
            uptodateSubscribedCaches: [],
            rtime32GcWelcomeTimestamp: ctx.clock.now(),
            txnCountryCode: ""
        });

        ctx.logger.info(
            "CS2 game server registered steamId=" + registration.serverId +
                " address=" + registration.serverAddress +
                " version=" + registration.version +
                " playerCaches=" + playerCaches.length
        );
    });

    gc.onMessage(Msg.Server2GCClientValidate, (ctx) => handleClientValidate(ctx));
}

function handleClientValidate(ctx: RawMessageContext): void {
    const request = ctx.decode(
        Proto.CMsgGCCStrike15v2Server2GCClientValidate
    ) as CMsgGCCStrike15v2Server2GCClientValidate;
    const accountIdValue = request.accountid ?? 0;
    if (accountIdValue === 0) {
        ctx.logger.info("Rejected CS2 game-server validation with empty account ID");
        return;
    }

    const playerSteamId = 76561197960265728n + BigInt(accountIdValue);
    ctx.send(
        Msg.SOCacheSubscribed,
        Proto.CMsgSOCacheSubscribed,
        buildInventoryCacheForPlayer(ctx, playerSteamId)
    );
    ctx.logger.info(
        "CS2 game-server player validated: accountId=" + accountIdValue +
            " steamId=" + playerSteamId
    );
}
