import { gc } from "../framework/gc";
import {
    CMsgGCCStrike15v2MatchmakingGC2ClientHello,
    CMsgGCCStrike15v2MatchmakingGC2ClientReserve,
    PlayerRankingInfo,
    Msg,
    Proto,
    Routes
} from "../generated/cs2";

interface ProfileOngoingReservation {
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

const ProfileDefaults = {
    PlayerLevel: 1,
    PlayerXp: 0,
    CompetitiveRankType: 6,
    CompetitiveRank: 1
} as const;

export function registerProfile(): void {
    gc.onMessage(Msg.AcknowledgePenalty, (ctx) => {
        const request = ctx.decode(Proto.CMsgGCCStrike15v2AcknowledgePenalty);
        ctx.logger.info("Accepted CS2 penalty acknowledgement " + (request.acknowledged ?? 0));
    });

    gc.on(Routes.MatchmakingHello, (ctx) => {
        ctx.reply(buildProfile(ctx.accountId));
    });

    gc.on(Routes.RequestPlayersProfile, (ctx) => {
        const requestedAccountId = ctx.request.accountId ?? 0;
        const accountId = requestedAccountId === 0 ? ctx.accountId : requestedAccountId;
        ctx.reply({
            requestId: ctx.request.requestIdDeprecated ?? 0,
            accountProfiles: [buildProfile(accountId)]
        });
    });

    // Current clients send message 9224 as a request containing the selected
    // Premier season. Echoing the requested identity with empty local stats
    // keeps the profile screen responsive without inventing online history.
    gc.on(Routes.PremierSeasonSummary, (ctx) => {
        const requestedAccountId = ctx.request.accountId ?? 0;
        ctx.reply({
            accountId: requestedAccountId === 0 ? ctx.accountId : requestedAccountId,
            seasonId: ctx.request.seasonId ?? 0,
            dataPerWeek: [],
            dataPerMap: []
        });
    });
}

export function buildProfile(
    accountId: number
): CMsgGCCStrike15v2MatchmakingGC2ClientHello {
    const ranking: PlayerRankingInfo = {
        accountId,
        rankId: ProfileDefaults.CompetitiveRank,
        wins: 0,
        rankChange: 0,
        rankTypeId: ProfileDefaults.CompetitiveRankType,
        highestRank: ProfileDefaults.CompetitiveRank
    };

    const active = cs2OngoingReservation(accountId) as ProfileOngoingReservation | null;
    const ongoingmatch = active === null ? undefined : buildOngoingMatch(active);

    return {
        accountId,
        ongoingmatch,
        vacBanned: 0,
        ranking,
        commendation: {
            cmdFriendly: 0,
            cmdTeaching: 0,
            cmdLeader: 0
        },
        medals: {
            displayItemsDefidx: [],
            featuredDisplayItemDefidx: 0
        },
        playerLevel: ProfileDefaults.PlayerLevel,
        playerCurXp: ProfileDefaults.PlayerXp,
        playerXpBonusFlags: 0,
        rankings: [ranking]
    };
}

function buildOngoingMatch(
    active: ProfileOngoingReservation
): CMsgGCCStrike15v2MatchmakingGC2ClientReserve {
    const ongoingRankings: PlayerRankingInfo[] = [];
    for (let i = 0; i < active.accountIds.length; i++) {
        ongoingRankings.push({
            accountId: active.accountIds[i],
            rankId: ProfileDefaults.CompetitiveRank,
            wins: 0,
            rankTypeId: ProfileDefaults.CompetitiveRankType,
            highestRank: ProfileDefaults.CompetitiveRank
        });
    }

    return {
        serverid: active.serverId,
        directUdpIp: active.directUdpIp,
        directUdpPort: active.directUdpPort,
        reservationid: active.reservationId,
        reservation: {
            accountIds: active.accountIds,
            gameType: active.gameType,
            matchId: active.matchId,
            serverVersion: active.serverVersion,
            rankings: ongoingRankings,
            flags: 0
        },
        map: active.map,
        serverAddress: active.serverAddress,
        gsLocationId: 0
    };
}
