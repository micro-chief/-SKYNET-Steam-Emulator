import { gc, RawMessageContext } from "../framework/gc";
import {
    CMsgGCCStrike15v2MatchmakingGC2ServerReserve,
    Msg,
    PlayerRankingInfo,
    Proto
} from "../generated/cs2";

const MatchmakingState = {
    Idle: 0,
    Searching: 1
} as const;

export function registerMatchmaking(): void {
    gc.onMessage(Msg.MatchmakingStart, (ctx) => handleStart(ctx));
    gc.onMessage(Msg.MatchmakingStop, (ctx) => handleStop(ctx));
    gc.onMessage(Msg.MatchmakingClient2ServerPing, (ctx) => handlePing(ctx));
    gc.onMessage(Msg.MatchmakingServerReservationResponse, (ctx) => handleServerReservationResponse(ctx));
    gc.onMessage(Msg.MatchEndRunRewardDrops, (ctx) => handleMatchEnd(ctx));
}

function handleStart(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgGCCStrike15v2MatchmakingStart);
    const accountIds = request.accountIds === undefined || request.accountIds.length === 0
        ? [ctx.accountId]
        : request.accountIds;
    const gameType = request.gameType ?? 0;
    const clientVersion = request.clientVersion ?? 0;

    ctx.send(Msg.MatchmakingGC2ClientUpdate, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate, {
        matchmaking: MatchmakingState.Searching,
        waitingAccountIdSessions: accountIds
    });

    const lan = cs2LanReservation(gameType, clientVersion);
    if (lan === null) {
        ctx.send(Msg.MatchmakingGC2ClientUpdate, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate, {
            matchmaking: MatchmakingState.Idle,
            error: "Local CS2 LAN target is disabled"
        });
        return;
    }

    const rankings: PlayerRankingInfo[] = accountIds.map((accountId) => ({
        accountId,
        rankId: 1,
        wins: 0,
        rankTypeId: 6,
        highestRank: 1
    }));

    if (!cs2ActivateLanReservation(lan, gameType, clientVersion, accountIds)) {
        ctx.send(Msg.MatchmakingGC2ClientUpdate, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate, {
            matchmaking: MatchmakingState.Idle,
            error: "Local CS2 reservation could not be persisted"
        });
        return;
    }

    const serverReservation = buildServerReservation(
        accountIds,
        gameType,
        lan.matchId,
        clientVersion,
        rankings
    );
    const queuedForServer = cs2QueueGameServerMessage(
        Msg.MatchmakingGC2ServerReserve,
        ctx.encode(Proto.CMsgGCCStrike15v2MatchmakingGC2ServerReserve, serverReservation)
    );

    ctx.send(Msg.MatchmakingGC2ClientReserve, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientReserve, {
        serverid: lan.serverId,
        directUdpIp: lan.directUdpIp,
        directUdpPort: lan.directUdpPort,
        reservationid: lan.reservationId,
        reservation: serverReservation,
        map: lan.map,
        serverAddress: lan.serverAddress,
        gsLocationId: 0
    });

    ctx.send(Msg.MatchmakingGC2ClientUpdate, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate, {
        matchmaking: MatchmakingState.Idle,
        ongoingmatchAccountIdSessions: accountIds
    });

    ctx.logger.info(
        "CS2 LAN reservation " + lan.reservationId + " assigned to " + accountIds.length +
            " account(s) at " + lan.serverAddress + " queuedForServer=" + queuedForServer
    );
}

function buildServerReservation(
    accountIds: number[],
    gameType: number,
    matchId: bigint,
    serverVersion: number,
    rankings: PlayerRankingInfo[]
): CMsgGCCStrike15v2MatchmakingGC2ServerReserve {
    return {
        accountIds,
        gameType,
        matchId,
        serverVersion,
        rankings,
        flags: 0
    };
}

function handleStop(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgGCCStrike15v2MatchmakingStop);
    if ((request.abandon ?? 0) !== 0) {
        cs2ClearReservation(ctx.accountId);
    }

    ctx.send(Msg.MatchmakingGC2ClientUpdate, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate, {
        matchmaking: MatchmakingState.Idle
    });
}

function handleServerReservationResponse(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgGCCStrike15v2MatchmakingServerReservationResponse);
    const reservationId = request.reservationid ?? 0n;
    if (reservationId === 0n) {
        ctx.logger.info("CS2 game server sent an empty reservation response");
        return;
    }

    const confirmed = cs2ConfirmReservation(reservationId);
    ctx.logger.info(
        "CS2 LAN reservation " + reservationId +
            " confirmation from server " + ctx.steamId +
            " accepted=" + confirmed
    );
}

function handlePing(ctx: RawMessageContext): void {
    ctx.send(Msg.MatchmakingGC2ClientUpdate, Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate, {
        matchmaking: MatchmakingState.Idle
    });
}

function handleMatchEnd(ctx: RawMessageContext): void {
    const request = ctx.decode(Proto.CMsgGCCStrike15v2MatchEndRunRewardDrops);
    const serverInfo = request.serverinfo;
    const reservationId = serverInfo?.reservationid ?? serverInfo?.gcReservationSent ?? 0n;
    if (reservationId === 0n) {
        ctx.logger.info("CS2 game server sent match end without a reservation id");
        return;
    }

    const finished = cs2FinishReservation(reservationId);
    if (finished === null) {
        ctx.logger.info(
            "Rejected CS2 match end for reservation " + reservationId +
                " from server " + ctx.steamId
        );
        return;
    }

    const idleUpdate = ctx.encode(
        Proto.CMsgGCCStrike15v2MatchmakingGC2ClientUpdate,
        { matchmaking: MatchmakingState.Idle }
    );
    for (let i = 0; i < finished.players.length; i++) {
        const player = finished.players[i];
        if (player.steamId === 0n) {
            continue;
        }

        cs2QueueClientMessage(player.steamId, Msg.MatchmakingGC2ClientUpdate, idleUpdate);
        const rankUpdate = ctx.encode(Proto.CMsgGCCStrike15v2ClientGCRankUpdate, {
            rankings: [{
                accountId: player.accountId,
                rankId: 1,
                wins: 0,
                rankChange: 0,
                rankTypeId: 6,
                highestRank: 1
            }]
        });
        cs2QueueClientMessage(player.steamId, Msg.ClientGCRankUpdate, rankUpdate);
    }

    ctx.logger.info(
        "CS2 LAN match " + finished.matchId + " completed for " +
            finished.players.length + " account(s)"
    );
}
