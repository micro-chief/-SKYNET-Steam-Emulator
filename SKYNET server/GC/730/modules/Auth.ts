import { gc } from "../framework/gc";
import { Msg, Proto, Routes } from "../generated/cs2";
import { buildInventoryWelcome } from "./Inventory";
import { buildProfile } from "./Profile";

const ConnectionStatus = {
    HaveSession: 0,
    NoSessionInLogonQueue: 3
} as const;

export function registerAuth(): void {
    gc.on(Routes.ClientHello, (ctx) => {
        const sessionNeed = ctx.request.clientSessionNeed ?? 0;

        ctx.send(Msg.GCClientConnectionStatus, Proto.Cs2ConnectionStatus, {
            status: ConnectionStatus.NoSessionInLogonQueue,
            clientSessionNeed: sessionNeed
        });

        ctx.reply(buildInventoryWelcome(ctx, ctx.request.version ?? 0));

        ctx.send(Msg.GCClientConnectionStatus, Proto.Cs2ConnectionStatus, {
            status: ConnectionStatus.HaveSession,
            clientSessionNeed: sessionNeed
        });

        // Valve pushes these immediately after GCClientWelcome. Waiting for
        // the later 9109/9194 client requests leaves the front-end bootstrap
        // incomplete, so inventory-related requests are never started.
        ctx.send(
            Msg.MatchmakingGC2ClientHello,
            Proto.CMsgGCCStrike15v2MatchmakingGC2ClientHello,
            buildProfile(ctx.accountId)
        );
        ctx.send(Msg.ClientGCRankUpdate, Proto.CMsgGCCStrike15v2ClientGCRankUpdate, {
            rankings: [{
                accountId: ctx.accountId,
                rankId: 0,
                wins: 0,
                rankTypeId: 11
            }]
        });

        ctx.logger.info("CS2 GC session established for account " + ctx.accountId);
    });
}
