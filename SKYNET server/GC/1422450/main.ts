import { gc, Route } from "./framework/gc";
import { Msg, Routes } from "./generated/deadlock";
import { requestDeadlockLeaveLobbyRaw } from "./modules/RequestDeadlockLeaveLobbyRaw";
import {
    RequestDeadlockPartySetReadyStateRoute,
    requestDeadlockPartySetReadyState
} from "./modules/RequestDeadlockPartySetReadyState";
import {
    RequestDeadlockPartyLeaveRoute,
    requestDeadlockPartyLeave
} from "./modules/RequestDeadlockPartyLeave";
import {
    RequestDeadlockPartyActionRoute,
    requestDeadlockPartyAction
} from "./modules/RequestDeadlockPartyAction";
import {
    RequestDeadlockGetMatchMetaDataRoute,
    requestDeadlockGetMatchMetaData
} from "./modules/RequestDeadlockGetMatchMetaData";
import { requestClientHello } from "./modules/RequestClientHello";
import {
    SOCacheSubscriptionRefreshRoute,
    requestSOCacheSubscriptionRefresh
} from "./modules/RequestSOCacheSubscriptionRefresh";
import {
    RequestDeadlockGetAccountStatsRoute,
    requestDeadlockGetAccountStats
} from "./modules/RequestDeadlockGetAccountStats";
import {
    RequestDeadlockHeroReleaseVoteTallyRoute,
    requestDeadlockHeroReleaseVoteTally
} from "./modules/RequestDeadlockHeroReleaseVoteTally";
import {
    RequestDeadlockGetRankDataRoute,
    requestDeadlockGetRankData
} from "./modules/RequestDeadlockGetRankData";
import {
    RequestDeadlockGetFriendGameStatusRoute,
    requestDeadlockGetFriendGameStatus
} from "./modules/RequestDeadlockGetFriendGameStatus";
import {
    RequestDeadlockGetProfileCardRoute,
    requestDeadlockGetProfileCard
} from "./modules/RequestDeadlockGetProfileCard";
import {
    RequestDeadlockGetMatchHistoryRoute,
    requestDeadlockGetMatchHistory
} from "./modules/RequestDeadlockGetMatchHistory";
import {
    RequestDeadlockGrantForumAccessRoute,
    requestDeadlockGrantForumAccess
} from "./modules/RequestDeadlockGrantForumAccess";
import {
    RequestDeadlockGetAccountMatchReportsRoute,
    requestDeadlockGetAccountMatchReports
} from "./modules/RequestDeadlockGetAccountMatchReports";
import {
    RequestGameServerHelloRoute,
    requestGameServerHello
} from "./modules/RequestGameServerHello";
import {
    RequestDeadlockSubmitPlaytestUserRoute,
    requestDeadlockSubmitPlaytestUser
} from "./modules/RequestDeadlockSubmitPlaytestUser";
import {
    RequestDeadlockStartRankedIntervalRoute,
    requestDeadlockStartRankedInterval
} from "./modules/RequestDeadlockStartRankedInterval";
import {
    RequestDeadlockPartyCreateRoute,
    requestDeadlockPartyCreate
} from "./modules/RequestDeadlockPartyCreate";
import {
    RequestDeadlockGetActiveMatchesRoute,
    requestDeadlockGetActiveMatches
} from "./modules/RequestDeadlockGetActiveMatches";
import {
    RequestDeadlockStartMatchmakingRoute,
    requestDeadlockStartMatchmaking
} from "./modules/RequestDeadlockStartMatchmaking";
import {
    RequestDeadlockStopMatchmakingRoute,
    requestDeadlockStopMatchmaking
} from "./modules/RequestDeadlockStopMatchmaking";
import {
    RequestDeadlockUpdateRosterRoute,
    requestDeadlockUpdateRoster
} from "./modules/RequestDeadlockUpdateRoster";
import {
    RequestDeadlockIsInMatchmakingRoute,
    requestDeadlockIsInMatchmaking
} from "./modules/RequestDeadlockIsInMatchmaking";
import {
    RequestDeadlockPartySetModeRoute,
    requestDeadlockPartySetMode
} from "./modules/RequestDeadlockPartySetMode";
import {
    RequestDeadlockPartyStartMatchRoute,
    requestDeadlockPartyStartMatch
} from "./modules/RequestDeadlockPartyStartMatch";
import {
    RequestDeadlockAllocateForMatchResponseRawRoute,
    requestDeadlockAllocateForMatchResponseRaw
} from "./modules/RequestDeadlockAllocateForMatchResponseRaw";
import { requestDeadlockServerEnterMatchmakingRaw } from "./modules/RequestDeadlockServerEnterMatchmakingRaw";
import { requestDeadlockPlayerHeroDataRaw } from "./modules/RequestDeadlockPlayerHeroDataRaw";
import { requestDeadlockMatchSignoutPermissionRaw } from "./modules/RequestDeadlockMatchSignoutPermissionRaw";
import { requestDeadlockMatchSignoutRaw } from "./modules/RequestDeadlockMatchSignoutRaw";
import { requestDeadlockUpdateLobbyServerStateRaw } from "./modules/RequestDeadlockUpdateLobbyServerStateRaw";

function generatedRoute(
    requestId: number,
    responseId: number,
    requestProtoName: string,
    responseProtoName: string
): Route {
    return {
        requestId: requestId,
        request: { name: requestProtoName },
        responseId: responseId,
        response: { name: responseProtoName }
    };
}

gc.onMessage(Msg.DeadlockMatchSignoutPermission, () =>
    requestDeadlockMatchSignoutPermissionRaw());
gc.onMessage(Msg.DeadlockMatchSignout, () =>
    requestDeadlockMatchSignoutRaw());
gc.onMessage(Msg.DeadlockUpdateLobbyServerState, () =>
    requestDeadlockUpdateLobbyServerStateRaw());
gc.onMessage(Msg.DeadlockServerEnterMatchmaking, () =>
    requestDeadlockServerEnterMatchmakingRaw());
gc.onMessage(Msg.DeadlockLeaveLobby, () =>
    requestDeadlockLeaveLobbyRaw());
gc.onMessage(Msg.DeadlockRequestPlayerHeroData, () =>
    requestDeadlockPlayerHeroDataRaw());

gc.on(Routes.ClientHello, requestClientHello);
gc.on(generatedRoute(Msg.SOCacheSubscriptionRefresh, Msg.SOCacheSubscribed, "CMsgSOCacheSubscriptionRefresh", "CMsgSOCacheSubscribed"), requestSOCacheSubscriptionRefresh);
gc.on(generatedRoute(Msg.GCGameServerHello, Msg.GCGameServerWelcome, "CMsgClientHello", "CMsgClientWelcome"), requestGameServerHello);
gc.on(generatedRoute(Msg.DeadlockPartyCreate, Msg.DeadlockPartyCreateResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyCreate", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyCreateResponse"), requestDeadlockPartyCreate);
gc.on(generatedRoute(Msg.DeadlockPartyStartMatch, Msg.DeadlockPartyStartMatchResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyStartMatch", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyStartMatchResponse"), requestDeadlockPartyStartMatch);
gc.on(generatedRoute(Msg.DeadlockPartyAction, Msg.DeadlockPartyActionResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyAction", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyActionResponse"), requestDeadlockPartyAction);
gc.on(generatedRoute(Msg.DeadlockPartyLeave, Msg.DeadlockPartyLeaveResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyLeave", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartyLeaveResponse"), requestDeadlockPartyLeave);
gc.on(generatedRoute(Msg.DeadlockPartySetReadyState, Msg.DeadlockPartySetReadyStateResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetReadyState", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetReadyStateResponse"), requestDeadlockPartySetReadyState);
gc.on(generatedRoute(Msg.DeadlockPartySetMode, Msg.DeadlockPartySetModeResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetMode", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCPartySetModeResponse"), requestDeadlockPartySetMode);
gc.on(generatedRoute(Msg.DeadlockStartRankedInterval, Msg.DeadlockStartRankedIntervalResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartRankedInterval", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartRankedIntervalResponse"), requestDeadlockStartRankedInterval);
gc.on(generatedRoute(Msg.DeadlockSubmitPlaytestUser, Msg.DeadlockSubmitPlaytestUserResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCSubmitPlaytestUser", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCSubmitPlaytestUserResponse"), requestDeadlockSubmitPlaytestUser);
gc.on(generatedRoute(Msg.DeadlockGetFriendGameStatus, Msg.DeadlockGetFriendGameStatusResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetFriendGameStatus", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetFriendGameStatusResponse"), requestDeadlockGetFriendGameStatus);
gc.on(generatedRoute(Msg.DeadlockGetProfileCard, Msg.DeadlockGetProfileCardResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetProfileCard", "SKYNET.Server.GameCoordinator.Citadel.CMsgCitadelProfileCard"), requestDeadlockGetProfileCard);
gc.on(generatedRoute(Msg.DeadlockGetMatchHistory, Msg.DeadlockGetMatchHistoryResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetMatchHistory", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetMatchHistoryResponse"), requestDeadlockGetMatchHistory);
gc.on(generatedRoute(Msg.DeadlockGrantForumAccess, Msg.DeadlockGrantForumAccessResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGrantForumAccess", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGrantForumAccessResponse"), requestDeadlockGrantForumAccess);
gc.on(generatedRoute(Msg.DeadlockGetAccountMatchReports, Msg.DeadlockGetAccountMatchReportsResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetAccountMatchReports", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetAccountMatchReportsResponse"), requestDeadlockGetAccountMatchReports);
gc.on(generatedRoute(Msg.DeadlockGetActiveMatches, Msg.DeadlockGetActiveMatchesResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetActiveMatches", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetActiveMatchesResponse"), requestDeadlockGetActiveMatches);
gc.on(generatedRoute(Msg.DeadlockGetMatchMetaData, Msg.DeadlockGetMatchMetaDataResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetMatchMetaData", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetMatchMetaDataResponse"), requestDeadlockGetMatchMetaData);
gc.on(generatedRoute(Msg.DeadlockStartMatchmaking, Msg.DeadlockStartMatchmakingResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartMatchmaking", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStartMatchmakingResponse"), requestDeadlockStartMatchmaking);
gc.on(generatedRoute(Msg.DeadlockStopMatchmaking, Msg.DeadlockStopMatchmakingResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStopMatchmaking", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCStopMatchmakingResponse"), requestDeadlockStopMatchmaking);
gc.on(generatedRoute(Msg.DeadlockUpdateRoster, Msg.DeadlockUpdateRosterResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCUpdateRoster", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCUpdateRosterResponse"), requestDeadlockUpdateRoster);
gc.on(generatedRoute(Msg.DeadlockIsInMatchmaking, Msg.DeadlockIsInMatchmakingResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCIsInMatchmaking", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCIsInMatchmakingResponse"), requestDeadlockIsInMatchmaking);
gc.on(generatedRoute(Msg.DeadlockGetAccountStats, Msg.DeadlockGetAccountStatsResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetAccountStats", "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetAccountStatsResponse"), requestDeadlockGetAccountStats);
gc.on(generatedRoute(Msg.DeadlockGetRankData, Msg.DeadlockGetRankDataResponse, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCGetRankData", "SKYNET.Server.GameCoordinator.Citadel.CMsgGCToClientGetRankDataResponse"), requestDeadlockGetRankData);
gc.on(generatedRoute(Msg.DeadlockRequestHeroReleaseVoteTally, Msg.DeadlockUpdateHeroReleaseVoteTally, "SKYNET.Server.GameCoordinator.Citadel.CMsgClientToGCRequestHeroReleaseVoteTally", "SKYNET.Server.GameCoordinator.Citadel.CMsgGCToClientUpdateHeroReleaseVoteTally"), requestDeadlockHeroReleaseVoteTally);
gc.on(
    generatedRoute(
        Msg.DeadlockAllocateForMatchResponse,
        Msg.DeadlockAllocateForMatchResponse,
        "CMsgClientHello",
        "CMsgClientWelcome"
    ),
    requestDeadlockAllocateForMatchResponseRaw
);

export async function handle(): Promise<boolean> {
    return await gc.dispatch();
}

export function tick(): void {
}
