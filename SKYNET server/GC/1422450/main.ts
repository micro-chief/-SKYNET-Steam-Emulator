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
    RequestDeadlockProfileRoute,
    RequestDeadlockProfile
} from "./modules/RequestDeadlockProfile";

import { gc } from "./framework/gc";

import {
    RequestDeadlockGetMatchMetaDataRoute,
    requestDeadlockGetMatchMetaData
} from "./modules/RequestDeadlockGetMatchMetaData";

import {
    ClientHelloRoute,
    requestClientHello
} from "./modules/RequestClientHello";

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
} from "./modules/RequestGameServerHello.ts";

import {
    RequestDeadlockSubmitPlaytestUserRoute,
    requestDeadlockSubmitPlaytestUser
} from "./modules/RequestDeadlockSubmitPlaytestUser.ts";

import {
    RequestDeadlockStartRankedIntervalRoute,
    requestDeadlockStartRankedInterval
} from "./modules/RequestDeadlockStartRankedInterval.ts";

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
import { RequestDeadlockIsInMatchmakingRoute, requestDeadlockIsInMatchmaking } from "./modules/RequestDeadlockIsInMatchmaking";
import { RequestDeadlockPartySetModeRoute, requestDeadlockPartySetMode } from "./modules/RequestDeadlockPartySetMode";

import {
    RequestDeadlockPartyStartMatchRoute,
    requestDeadlockPartyStartMatch
} from "./modules/RequestDeadlockPartyStartMatch";

export function handle(): boolean {
    gc.on(
        RequestDeadlockPartyCreateRoute,
        requestDeadlockPartyCreate
    );

    gc.on(
        RequestDeadlockPartyStartMatchRoute,
        requestDeadlockPartyStartMatch
    );

    gc.on(
        RequestDeadlockPartyActionRoute,
        requestDeadlockPartyAction
    );

    gc.on(
        RequestDeadlockPartyLeaveRoute,
        requestDeadlockPartyLeave
    );

    gc.on(
        RequestDeadlockPartySetReadyStateRoute,
        requestDeadlockPartySetReadyState
    );

    gc.on(
        RequestDeadlockStartRankedIntervalRoute,
        requestDeadlockStartRankedInterval
    );

    gc.on(
        RequestDeadlockSubmitPlaytestUserRoute,
        requestDeadlockSubmitPlaytestUser
    );

    gc.on(
        ClientHelloRoute,
        requestClientHello
    );




    gc.on(
        RequestDeadlockGetFriendGameStatusRoute,
        requestDeadlockGetFriendGameStatus
    );

    gc.on(
        RequestDeadlockGetProfileCardRoute,
        requestDeadlockGetProfileCard
    );

    gc.on(
        RequestDeadlockGetMatchHistoryRoute,
        requestDeadlockGetMatchHistory
    );

    gc.on(
        RequestDeadlockGrantForumAccessRoute,
        requestDeadlockGrantForumAccess
    );

    gc.on(
        RequestDeadlockGetAccountMatchReportsRoute,
        requestDeadlockGetAccountMatchReports
    );

    gc.on(
        RequestGameServerHelloRoute,
        requestGameServerHello
    );

    gc.on(
        RequestDeadlockGetActiveMatchesRoute,
        requestDeadlockGetActiveMatches
    );

    gc.on(
        RequestDeadlockGetMatchMetaDataRoute,
        requestDeadlockGetMatchMetaData
    );

    gc.on(
        RequestDeadlockStartMatchmakingRoute,
        requestDeadlockStartMatchmaking
    );

    gc.on(
        RequestDeadlockStopMatchmakingRoute,
        requestDeadlockStopMatchmaking
    );

    gc.on(
        RequestDeadlockUpdateRosterRoute,
        requestDeadlockUpdateRoster
    );

    gc.on(
        RequestDeadlockIsInMatchmakingRoute,
        requestDeadlockIsInMatchmaking
    );

    gc.on(
        RequestDeadlockPartySetModeRoute,
        requestDeadlockPartySetMode
    );

    gc.on(
        RequestDeadlockGetAccountStatsRoute,
        requestDeadlockGetAccountStats
    );

    gc.on(
        RequestDeadlockGetRankDataRoute,
        requestDeadlockGetRankData
    );

    gc.on(
        RequestDeadlockHeroReleaseVoteTallyRoute,
        requestDeadlockHeroReleaseVoteTally
    );

    return gc.dispatch();
}

export function tick(): void {
}
