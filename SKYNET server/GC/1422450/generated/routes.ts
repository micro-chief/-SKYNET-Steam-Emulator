/**
 * В реальном проекте enum должен генерироваться
 * на основе зарегистрированных GC routes.
 */
export enum Routes {
    RequestDeadlockProfile = "RequestDeadlockProfile",
    RequestDeadlockMatchHistory = "RequestDeadlockMatchHistory",
    RequestDeadlockJoinQueue = "RequestDeadlockJoinQueue",
    GetMatchHistory = "GetMatchHistory",
    RequestClientHello = "RequestClientHello",
    RequestDeadlockGetAccountStats = "RequestDeadlockGetAccountStats",
    RequestDeadlockHeroReleaseVoteTally = "RequestDeadlockHeroReleaseVoteTally",
  RequestDeadlockStartMatchmaking = "RequestDeadlockStartMatchmaking",
    RequestDeadlockPartySetMode = "RequestDeadlockPartySetMode",
}