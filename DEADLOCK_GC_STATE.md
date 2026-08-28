# Deadlock Locally GameCoordinator — Current State

Updated: 2026-08-25

## Project

Deadlock / Citadel
AppID: 1422450

Repo:
D:\Visual Studio Test repos\-SKYNET-Steam-Emulator-master

Server:
D:\Visual Studio Test repos\-SKYNET-Steam-Emulator-master\SKYNET server

GC:
D:\Visual Studio Test repos\-SKYNET-Steam-Emulator-master\SKYNET server\GC\1422450

## Known-good lifecycle

Client GC login ✅
Private Lobby ✅
Party SO ✅
Teams / slots ✅
Hero Select ✅
Ready ✅
FindingMatch ✅
Match Found ✅
Dedicated launch ✅
GameServer GC login ✅
10023 -> 10021 ✅
10022 allocation ✅
type101 ✅
type102 ✅
type106 ✅
automatic client connect ✅
GameInProgress ✅
real victory/PostGame ✅
10012 -> 10013 ✅
10014 Decoder V2 ✅
10015 Success(4) ✅
10025 ingestion ✅
9015 V2 fallback ✅
35s delayed dedicated release ✅

## Current P0

Repeated Custom Match lifecycle.

Historical symptom:

Match #1 ends
-> client returns
-> stale "МАТЧ ИДЁТ"
-> Match #2 cannot auto-connect
-> manual 9015 fixes state.

Official Nethook2 capture from two consecutive Custom Matches proved:

26 type101 server_state=PostMatch(2)
-> 25 CacheUnsubscribed

No automatic 9015.

Patch prepared:

TYPE101 POSTMATCH FANOUT V1.1

Expected:

10025 state=2
-> client msg26 type101 PostMatch

10014 -> 10015
-> client msg25 CacheUnsubscribed

Status:
WAITING FOR LIVE TEST.

Do not mark fixed yet.

## Test required

Without restarting anything:

1. Custom Match #1
2. natural victory
3. do NOT manually Leave Match
4. return to dl_hideout
5. verify "МАТЧ ИДЁТ" is absent
6. immediately start Custom Match #2
7. verify automatic connection
8. preferably finish Match #2 too

## Official post-match discoveries

After normal Custom Match:

26 type101 PostMatch
25 CacheUnsubscribed
26 type107 CSOAccountHeroInfo
9166 GCToClientAccountStatsUpdated

type107 + 9166 are NOT yet implemented as full post-match analytical/stat sync.

## Private match policy

match_mode == 2 => PrivateLobby.

Private matches are ephemeral.

Do not persist to:
- AccountStats
- HeroStats
- MatchHistory
- Ranked

Important:
real PrivateLobby produced:
not_scored_present=true
not_scored=false

Therefore not_scored MUST NOT be used as private persistence gate.

## Match ID

Current local flow may still use match_id == lobby_id.

Official GC does NOT.

Official examples:

lobby 102042566883040604
match 101163182

lobby 174100160920973949
match 101164203

Source audit completed on 2026-08-25. See "Match ID source audit V2.6"
below. The separate allocator and start-path propagation are live confirmed.

## Pending

10041 telemetry — intentionally unhandled.
9176 new player progress — unhandled.
type107 postmatch — pending.
9166 AccountStatsUpdated — pending.
unique match ID allocator — live start confirmed.
Normal/Ranked DB result persistence — pending.

## Protected

Do not regress:

10014 Decoder V2
10015 = Success(4)
35s release
10025 ingestion
9015 V2
type106
Ranked/Profile/MatchHistory
automatic assignment/connect

## SKYNET_DEADLOCK_REPEATED_MATCH_UNIQUE_LOBBY_V1

Live evidence from the first V1.1 test:

- 10025 PostMatch was accepted.
- client type101 PostMatch queue26 succeeded.
- 10015 Success(4) was followed by client msg25 cleanup.
- no automatic 9015 was emitted.
- the confirmed 35000ms dedicated release remained active.

Repeated-match failure root cause:

- Party ID remained stable, as required.
- The same Party ID was also reused as the Supervisor lobby/reservation key.
- Match #2 started during the old server's 35s grace and therefore reused the
  old PostGame reservation instead of launching a new dedicated.
- A later retry worked only after the delayed release stopped the old process.

Installed, awaiting live confirmation:

- unique ephemeral lobby/match ID per local match;
- stable Party SO ID remains unchanged;
- Supervisor, 10021, server type101/102/106 and client type101 use the unique ID;
- client assignment uses the actual reservation port (27125, 27126, ...);
- old/new GameServerHello identities may safely overlap;
- stale old-lobby 10025 cannot mutate the new client lobby lifecycle.

Next test: finish Match #1 naturally, return to dl_hideout, immediately start
Match #2 before the 35s release, and confirm automatic connection to the new
port without using Return to Match.

## SKYNET_DEADLOCK_CLIENT_ASSIGN_AFTER_READY_V1

Second unique-lobby live test result:

- unique lobby IDs worked: ...1001 then ...1002;
- Match #2 launched a new dedicated PID and completed 10023 -> 10021 -> 10022;
- actual reservation port and all four client assignment messages were queued;
- the client still failed automatic entry.

Dedicated console evidence identified the remaining race:

- assignment reached the client while the server was still in its initial map;
- the client connection was accepted immediately before Changelevel;
- NETWORK_DISCONNECT_LOOPSHUTDOWN destroyed that connection;
- after the final map became active, packets were logged as stray data with no
  connection and the client did not create a second handshake;
- Match #1 succeeded only because its first attempt was rejected and the client
  happened to retry after the socket reopened.

Installed, awaiting live confirmation:

- 10022 now arms a pending client assignment only;
- first accepted 10025 InGame is treated as pre-changelevel and deferred;
- second accepted 10025 InGame queues the existing four-message client fanout;
- unique lobby, actual port, PostMatch, 10014, 10015 and 35000ms release remain
  protected.

Next test: start Match #1 and verify the log contains InGame report=1 deferred,
then InGame report=2 and assignment queued after map active. Finish naturally
and repeat Match #2 without using Return to Match.

## SKYNET_DEADLOCK_POSTMATCH_ANALYTICS_EPHEMERAL_V1

Live P0 confirmation:

- Match #2 connected automatically and finished normally;
- Match #3 started without restarting the client or server;
- repeated-match lifecycle is confirmed complete.

Installed for P1 live validation:

- Decoder V2 retains lobby, match mode and account/hero/outcome rows only for
  the current 10014 exchange;
- after 10015 Success and 25 CacheUnsubscribed, the GC queues one
  26/type107 CSOAccountHeroInfo update for each played account/hero;
- type107 values are read from the existing DB snapshot and are not changed;
- type107 is followed by 9166 with an empty protobuf payload;
- no AccountStats, HeroStats, MatchHistory or RankedState write is performed;
- PrivateLobby remains ephemeral regardless of not_scored.

Expected live log:

  [10014-V2] COMPLETE ... ephemeral_players=1
  [POSTMATCH-ANALYTICS] account_id=... hero_id=... queue9166=empty
  [POSTMATCH-ANALYTICS] COMPLETE ... persistence=none
  [10014-GS] postmatch analytics queued=True

Post-match UI validation remains pending.

## Conditional bot-match launch V1 (installed; live test pending)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V1_STATE

Official NetHook 1787497978 evidence:

- bot-match Party SO type105 retained bot_difficulty=3 (Hard), match_mode=2,
  game_mode=1 and one real member;
- the analytics table is bot-participant-driven, not carried by 9166;
- 9166 remains a separate full CMsgAccountStats refresh correction.

Installed behavior:

- PartyStartMatch passes party.bot_difficulty into the dedicated launch;
- bot_difficulty=0 queues no bot preset;
- bot_difficulty=1..5 queues citadel_botmatch_practice_6v6.cfg only after +map;
- shared test-game citadel_server.cfg no longer enables bots globally;
- persistence and the proven repeated-match lifecycle are unchanged.

Live acceptance:

1. no-bot match: bots=false, no +exec, no bots, no analytics table;
2. bot match: bots=true, +map then +exec, bots spawn and the analytics table
   appears after completion.

## Conditional bot-match launch V1.2 (installed; live test pending)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V12_STATE

Live V1.1 evidence showed bot_difficulty=3 and +exec were selected correctly,
but console.log proved the preset executed before ResetGameConVarsToDefaults.
V1.2 selects skynet_botmatch_server.cfg for bot matches so Source 2 runs the
base server cfg and Valve bot preset in the later dedicated config phase.
No-bot matches retain the ordinary citadel_server.cfg path.

## Conditional bot-match launch V1.3 (installed; live test pending)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_STATE

Live V1.2 proved both bot cfg executions occurred after the engine reset, but
the dedicated logged "Precaching 1 heroes" and signout contained players=1.
The local type102 had gc_provided_heroes=true with only the real member. V1.3
omits that flag only when bot_difficulty>0, allowing the dedicated to select
and precache its server-managed bot roster. The no-bot path remains true.

## Conditional bot-match V1.3 rollback (hero path restored)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V13_ROLLBACK_HERO_STATE_V1

Live V1.3 disproved the server-managed-roster hypothesis. Omitting type102
gc_provided_heroes removed the selected player hero, while the dedicated still
created no bot fake clients. The proven unconditional gc_provided_heroes=true
path is restored. Bot creation remains unresolved and requires a separate,
evidence-backed change.

## Conditional bot-match V1.4 (static bot members; live test pending)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V14_STATE

Official server protobuf evidence defines bot_difficulty on each
CSOCitadelServerStaticLobby.Member as field 16. Live V1.2/V1.3 showed the
outer bot_difficulty and practice cfg were insufficient: only the human Member
was present and the server precached one hero. V1.4 retains the restored human
hero path and fills unoccupied 6v6 player slots with bot Members before the
game-session manifest is built. No-bot matches still publish humans only.

## Conditional bot-match V1.5 (live-build hero pool; live test pending)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V15_STATE

Live V1.4 proved the 12-slot static roster path and produced working bot-driven
post-match analytics, but the dedicated created only seven of eleven bots. Its
console received all eleven bot Members and rejected hero IDs 23, 22, 5 and 28
before fake-client creation. V1.5 removes those cross-build IDs, leads with the
seven IDs accepted in that live run, and fills the remaining unique choices from
the captured hero dataset used by this build. Ordinary no-bot matches are
unchanged.

## Conditional bot-match V1.6 (human signout slot; live test pending)

Marker: SKYNET_DEADLOCK_CONDITIONAL_BOTS_V16_STATE

Live V1.5 confirmed all eleven bots spawn and the dedicated computes the human
as MVP. A direct A/B comparison isolated the missing post-match human row to the
single-human bot roster using player_slot=0: that match omitted account 100000
from match_data.players, while the earlier player_slot=2 match emitted the human,
full stats and account-stat changes. Bots themselves are valid in player_slot=0.
V1.6 therefore remaps only a single real human in a bot match from server slot 0
to the already proven slot 2; the freed slot 0 remains available to a bot. The
12-player roster, hero pool, no-bot path and repeated-match lifecycle are unchanged.

## Post-match V1.7 (synthetic type107 crash guard; live confirmed)

Marker: SKYNET_DEADLOCK_POSTMATCH_TYPE107_CRASH_GUARD_V17_STATE

Live evidence from match 101787557354226001 proved the dedicated signout itself
was complete: account 100000, hero 1, player_slot 6, full player stats, account
stat changes and server-calculated MVP were present. The client successfully
retrieved PostMatch 26 (97 bytes) and CacheUnsubscribed 25 (22 bytes), then
retrieved the synthetic type107 26 (53 bytes) and immediately wrote an access
violation dump. It never retrieved the queued 9166. The dump records C0000005,
a read from address 0xB inside client.dll+0x1DC7145. V1.7 disables only the
unverified synthetic type107/9166 refresh. The genuine bot-driven match table,
human/MVP result, P0 lifecycle, 12-player roster and persistence policy remain.

Live acceptance confirmed:

- all eleven bots were present;
- account 100000 appeared in the post-match table with full statistics;
- MVP rendered correctly;
- the client completed the post-match flow without crashing.

## Multiplayer hardening V1.8 (single-client advertisement live confirmed)

Markers:

- SKYNET_DEADLOCK_MULTIPLAYER_CONNECT_IP_V18
- SKYNET_DEADLOCK_MULTIPLAYER_ROSTER_GUARD_V18
- SKYNET_DEADLOCK_MULTIPLAYER_HARNESS_V18

Installed behavior:

- client lobby assignment uses the dedicated reservation public IP instead of
  hardcoded 127.0.0.1, with loopback retained only as a missing-IP fallback;
- human roster slots are unique and capacity-limited to 12;
- duplicate custom slots are relocated deterministically;
- duplicate account IDs and a 13th human abort the invalid allocation;
- the offline contract harness covers 1..12 humans, bot fill, 6v6 balance and
  Assign/PostMatch/CacheUnsubscribed fanout counts without real clients.

Status:

- automated contract matrix: passed for 1..12 humans in bot and no-bot modes;
- C# build and real TypeSharp GC script compilation: passed;
- dedicated advertised endpoint reached the client in a live match;
- the native NETWORK / GAME SERVER load indicator rendered in the client;
- no separate synthetic server-load UI payload is required;
- one-machine lifecycle: previously live confirmed;
- cross-machine auto-connect and two-client post-match UI: live test pending.

Advertised IP policy:

- GC consumes reservation.publicIp; it does not hardcode 192.168.0.101;
- 192.168.0.101 is appropriate for this host and players on the same LAN;
- remote players must use an address routable by every participant, such as
  the host Radmin VPN address, selected through the existing server settings UI.

## Custom lobby switches V1.9 (partially confirmed, map/focus disproved)

Markers:

- SKYNET_DEADLOCK_CUSTOM_SWITCHES_V19
- SKYNET_DEADLOCK_CUSTOM_SWITCHES_HARNESS_V19
- SKYNET_DEADLOCK_DEDICATED_NO_FOCUS_V19

Installed behavior:

- bot difficulty follows the four choices exposed by this client: 0=None,
  1=Easy, 2=Medium and 3=Hard; values 1..3 continue into both the dedicated
  launch environment and every generated bot Member;
- game mode 1 launches `dl_midtown` with a 12-player/6v6 roster;
- V1.9 originally routed game mode 4 to `dl_streets` with an 8-player/4v4
  roster; the map choice was disproved live because `dl_streets` is the
  retained old four-lane battlefield;
- the type101 common lobby already carries the selected game_mode and type102
  now carries the matching level name and mode-specific participant capacity;
- standard lane distribution ignores manual match-slot placement while keeping
  each member's selected team; manual distribution consumes exact user slots;
- invalid mode and difficulty PartyAction values are rejected;
- V1.9 stopped granting foreground activation permission to hidden dedicated
  launches, but that was insufficient because Source 2 later creates and
  activates its own GUI window.

Verification:

- offline matrix passed Normal and Street Brawl for difficulty 0..3, standard
  and manual lanes, bot fill, unique slots and capacity overflow rejection;
- C# build passed with zero warnings and zero errors;
- the real TypeSharp runtime loaded all app 1422450 routes and handled message
  4006 after compiling the modified scripts;
- live difficulty switching for None/Easy/Medium/Hard: confirmed;
- live Street Brawl selection: reached a match, but on the wrong legacy map;
- live no-focus behavior: disproved, the server window still became foreground.

## Custom lobby switches V2.0 correction (live confirmed)

Markers:

- SKYNET_DEADLOCK_STREET_BRAWL_MIDTOWN_V20
- SKYNET_DEADLOCK_DEDICATED_ISOLATED_DESKTOP_V20

Installed behavior:

- Normal and Street Brawl both launch the current `dl_midtown` map;
- type101 `game_mode=1` or `game_mode=4` remains the ruleset selector;
- Street Brawl keeps its mode-specific 8-player/4v4 static roster;
- hidden Deadlock dedicated processes launch on a private non-input Windows
  desktop, preventing their GUI windows from becoming foreground on the
  user's interactive desktop;
- visible diagnostic launches remain on the normal interactive desktop.

Verification:

- local installed map files confirm `dl_streets` is older than the current
  `dl_midtown` build and is retained as a separate legacy map;
- offline contract matrix passes both modes on `dl_midtown`, difficulty 0..3,
  both lane policies and mode-specific capacity guards;
- C# build passes with zero warnings and zero errors;
- direct Windows CreateDesktop/CloseDesktop permission probe passes;
- live Street Brawl launched on the current Midtown map;
- live hidden dedicated launch no longer stole foreground focus;
- post-match statistics rendered, but the Street Brawl result contained only
  seven players: Team0 slots 2,1,3 and Team1 slots 4,5,6,7.

## Street Brawl post-match roster V2.1 (live confirmed)

Marker: SKYNET_DEADLOCK_STREET_BRAWL_SIGNOUT_SLOTS_V21

Live root-cause evidence from match 101787577629564001:

- the static lobby contained a full 4v4 roster in logical slots 0..7;
- all seven bots plus the human participated in the match;
- the real dedicated 10014 signout contained only slots 1..7 and therefore
  rendered three players on Team0 and four on Team1;
- historical Normal captures show the same omission of logical slot 0;
- the dedicated Accolades calculation selected account 100000 as MVP rank 1,
  so MVP calculation itself succeeded even though the client did not render a
  Key Players section.

Installed behavior:

- Street Brawl maps its eight logical participants to the proven non-zero
  range 1..8;
- Team0 uses slots 1..4 and Team1 uses slots 5..8;
- manual UI slots and standard distribution both use the shifted mapping;
- Normal remains unchanged because a complete shifted 6v6 would require the
  currently unproven logical slot 12;
- no synthetic MVP/Key Players payload is emitted: bots have account_id=0 and
  the exact server-to-client post-game progress message has not yet been
  captured, while the previous guessed type107 refresh crashed client.dll.

Verification:

- offline roster matrix passes Street Brawl 1..8 humans, bot fill, all four
  difficulty choices and both lane policies with unique slots 1..8;
- Normal 6v6 regression matrix remains green;
- C# build passes with zero warnings and zero errors;
- live Street Brawl result confirmed four rows on Team0 and four rows on
  Team1; the complete 4v4 roster now survives into post-match statistics.

## Street Brawl Key Players V2.2 (live confirmed)

Marker: SKYNET_DEADLOCK_STREET_BRAWL_POSTGAME_PROGRESS_V1

New protocol evidence:

- the official incoming 9166 packet is not `CMsgPostGameProgressData`; its
  decoded top level is account_id plus repeated per-hero account-stat blocks;
- `CMsgServerToGCMatchSignoutResponse` 10015 contains only result=Success, so
  MVP data must not be appended to the two-byte `[08 04]` response;
- this client already defines and consumes `CMsgPostGameProgressData`, and the
  real Street Brawl dedicated calculated account 100000 as MVP rank 1;
- the client convar `citadel_post_game_progress` explicitly supports value 1
  as force-enabled, while its value 0 applies the mode-dependent default;
- Valve's generic `CMsgGCToClientApplyRemoteConVars` transport is message 4520.

Installed A/B behavior:

- immediately before the normal Street Brawl lobby assignment, each human
  client is queued message 4520 setting `citadel_post_game_progress=1`;
- Normal mode receives no override and retains its native default behavior;
- no synthetic type107, 9166, MVP model, accolade, match result or database
  write is introduced;
- the proven 4v4 slots, signout, unsubscribe and repeated-match lifecycle are
  unchanged.

Verification:

- multiplayer contract harness passes;
- C# build passes with zero warnings and zero errors;
- live Street Brawl acceptance passed: Key Players/MVP rendered, the full 4v4
  statistics table remained present and the client did not crash.

## Normal manual lanes / complete signout V2.5 (accepted)

Markers:

- SKYNET_DEADLOCK_MANUAL_LANE_ID_V25
- SKYNET_DEADLOCK_NONZERO_SIGNOUT_SLOTS_V25

Live evidence from Normal match 101787636735912002:

- the user selected private-lobby slot 13, but type102 only converted it to
  player_slot=3 and omitted the official Member.lane_id field;
- the dedicated consequently selected assigned_lane=6 itself, which did not
  match the clicked branch;
- the complete static 6v6 roster used slots 0..11, but 10014 again omitted the
  entire slot-0 player (hero 7 / Wraith), so that row disappeared from the
  post-match statistics.

Installed behavior:

- manual Normal placement writes CSOCitadelServerStaticLobby.Member.lane_id
  (protobuf field 10) for both humans and generated bots;
- the six positions on each team map in pairs to Midtown lane IDs 1, 4 and 6;
- standard/random lane policy omits lane_id and leaves allocation to the game;
- Normal now uses non-zero player slots 1..12, matching the already proven
  Street Brawl strategy and avoiding the dedicated's slot-0 signout omission;
- no Steam DLL, post-match fanout, replay path or persistence code changed.

Offline verification:

- multiplayer contract matrix passes Normal 6v6 and Street Brawl 4v4 for
  1..capacity humans, all bot difficulties and both lane policies;
- live manual-lane acceptance passed: the player was assigned to the branch
  selected in the private-lobby UI;
- the shifted Normal roster was accepted at match start;
- the user accepted V2.5 without another full-match post-game-table run, so
  the 12-row result is covered by the non-zero-slot fix and offline matrix but
  was not independently re-captured after this exact patch.

## Local replay delivery (rolled back)

The unconfirmed V2.3/V2.3.1/V2.4 implementation was removed at the user's
request after repeated live failures. The server again emits the previously
captured static official-shape 9168 response, the SteamHTTP replay interception
and local archive endpoint are absent, and post-signout dedicated release is
back to 35 seconds. Match lifecycle, bots, Street Brawl, post-match statistics
and MVP/Key Players behavior remain unchanged.

## Match ID separation V2.6 (live start confirmed)

Official evidence:

- lobby 102042566883040604 used match 101163182;
- lobby 174100160920973949 used match 101164203;
- therefore lobby_id and match_id are independent identifiers.

Current local source chain:

- DeadlockMatchLobbyState stores only party_id plus one ephemeral lobby_id;
- RequestDeadlockServerEnterMatchmakingRaw sends that lobby_id as the 10021
  match_id;
- server and client type101 builders write the same lobby_id into fields 1 and
  2;
- the dedicated faithfully returns those supplied values as 10014 field 3
  lobby_id and field 4 match_id;
- Decoder V2 already reads both fields independently and retains the real
  signout match_id for the ephemeral result model;
- Matches.MatchId and MatchPlayers.MatchId are already the canonical future DB
  keys, but private matches remain intentionally unpersisted.

Required separation:

- allocate lobby_id and match_id together when 9131 begins a new match;
- keep lobby_id as the owner.id for type3 SO caches, type102/type106 identity,
  10025 lifecycle lookup, dedicated reservation and release;
- send the separate match_id in 10021 and every type101 Assign/InGame/PostMatch
  snapshot;
- do not rewrite 10014: the dedicated should echo the match_id received through
  10021, while its lobby_id continues to select the reservation;
- clear both IDs atomically after successful CacheUnsubscribed;
- use the decoded 10014 match_id as the future Matches/MatchPlayers/history key.

Safety constraints for the allocator:

- non-zero and unique across rapid restarts, not merely unique inside one TS
  runtime;
- within signed SQLite INTEGER range;
- disjoint from the temporary 8,000,000,000,000,000 history-bootstrap range;
- no private-match result row may be written merely to reserve an ID.

Installed behavior:

- the host allocates a non-zero match_id from a dedicated monotonic time-based
  namespace beginning at 600,000,000,000,000,000;
- the current match state stores party_id, lobby_id and match_id together and
  clears both match identifiers after successful CacheUnsubscribed;
- 10021 carries the separate match_id while dedicated reservation lookup still
  uses lobby_id;
- server and client type101 Assign/InGame/PostMatch payloads carry the separate
  match_id;
- type102, type106, type3 cache ownership, 10025 lifecycle and dedicated release
  remain keyed by lobby_id;
- 10014 is unchanged and should echo the supplied IDs in fields 3 and 4.

Offline verification:

- multiplayer/custom-switch contract matrix passed;
- C# build passed with zero warnings and zero errors;
- the production GameCoordinatorScriptPlugin compiled the complete app 1422450
  TypeSharp graph with errors=0;
- no private match result or allocator row is written to the database.

Live start acceptance from 2026-08-25:

- allocated lobby_id 101787644670611001;
- allocated match_id 601787644670611001;
- 10023/10021 used lobby_id for reservation lookup and the separate match_id
  for allocation;
- server type101 carried the same distinct pair;
- the second InGame report triggered client assignment successfully with one
  target and zero failures;
- no compile/runtime error occurred.

The original V2.6 match was intentionally not finished. A later V2.7
Unranked signout independently confirmed the dedicated echo with lobby_id
`101787674794464002` and match_id `601787674794464002` in 10014 fields 3 and
4 respectively.

## Scored matchmaking launch with Hard bots V2.7 (installed, live pending)

Markers:

- SKYNET_DEADLOCK_SCORED_HARD_BOTS_V27
- SKYNET_DEADLOCK_SCORED_HARD_BOTS_V27_PARTY_MODE

Installed behavior:

- client message 9010 now starts the existing dedicated lifecycle for Normal
  Unranked (`match_mode=1`) and Ranked (`match_mode=4`);
- both modes run the current `dl_midtown` Normal 6v6 ruleset;
- every empty roster position is filled through the proven static-lobby bot
  path with maximum client-supported difficulty Hard (`bot_difficulty=3`);
- the requesting human's 9010 hero roster is retained for server hero choice;
- PartySetMode and 9010 share the same current Party snapshot;
- 9031 reports the real Party matchmaking state instead of hardcoded true;
- private/custom lobby difficulty and launch behavior are unchanged;
- no match, player, account, hero-stat or history database rows are written by
  this patch. Persistence remains the next P2 stage after live launch proof.

Offline verification:

- multiplayer contract harness passes, including forced Hard bot fill and hero
  roster propagation for scored launch;
- C# build passes with zero warnings and zero errors;
- the production GameCoordinatorScriptPlugin compiles the complete app 1422450
  TypeSharp graph with errors=0.

Live status from 2026-08-25:

- Unranked launched, auto-connected and built the complete 12-member static
  roster with one human plus eleven difficulty-3 bots;
- Ranked also launched and connected successfully;
- 10014 decoded the complete 12-player Unranked result and classified it as a
  persistence candidate;
- public Street Brawl exposed a V2.7 bug: 9010 carried `match_mode=1` plus
  `game_mode=4`, but the handler overwrote game_mode with Normal(1), producing
  a 12-member Normal match;
- after the player sent 9015 and restarted the client, the UI offered
  "Return to match" once. The log shows the local type3 state was cleared,
  10014 completed as AllAbandoned, and the dedicated was released normally;
  treat this as a client-local/early-leave observation unless it reproduces
  after an ordinarily completed match.

## Searchable Match ID and public Street Brawl V2.8 (installed, live pending)

Markers:

- SKYNET_DEADLOCK_SCORED_GAME_MODE_V28
- SKYNET_DEADLOCK_SEARCHABLE_MATCH_ID_V28_HOST
- SKYNET_DEADLOCK_SEARCHABLE_MATCH_ID_V28_RUNTIME
- SKYNET_DEADLOCK_SEARCHABLE_MATCH_ID_V28_DB

Installed behavior:

- 9010 now treats match_mode and game_mode independently;
- match_mode continues to select Unranked(1) or Ranked(4);
- game_mode now selects Normal(1) 6v6 or Street Brawl(4) 4v4 and is propagated
  into the shared Party/static lobby instead of being overwritten;
- both public game modes still fill empty positions with Hard(3) bots;
- Match IDs are limited to the client's ten-digit hideout search field;
- a persistent `RuntimeCounters` row in deadlock.db guarantees monotonic IDs
  across allocations and server restarts without creating fake Matches rows;
- the initial time floor preserves the useful ten-digit prefix shape of V2.6,
  for example `6017876782`.

Offline verification:

- multiplayer harness passes Normal/Street Brawl, Unranked/Ranked, Hard bot
  fill, mode-specific 12/8 capacity and the searchable-ID contract;
- C# build passes with zero warnings and zero errors;
- production TypeSharp graph compiles with errors=0;
- temporary-database test allocated consecutive ten-digit IDs before and
  after reconstructing DeadlockDB, confirming restart persistence.

Live status:

- pending a short public Street Brawl start; expected type102 is
  `game_mode=4`, capacity 8, with one human plus seven Hard bots;
- live Match ID `6017876786` confirmed the ten-digit allocation and propagated
  into the client's completed match lifecycle;
- the supplied client log did not include the server-side type102 roster line,
  so public Street Brawl 4v4 capacity remains structurally/offline verified
  rather than independently re-captured from that attachment.

## Per-client advertised dedicated address V2.9 (live confirmed)

Markers:

- SKYNET_DEADLOCK_ADVERTISED_IP_PRIORITY_V29
- SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_RUNTIME
- SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_WIRE
- SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_RESOLVER
- SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29_HOST
- SKYNET_DEADLOCK_PER_CLIENT_CONNECT_IP_V29

Live root-cause evidence from match `6017876786`:

- the client connected to `172.31.192.1:27125` with zero latency;
- that address belongs to the host-only Hyper-V `vEthernet (Default Switch)`;
- appsettings/admin explicitly advertises `192.168.0.101`;
- game-server registration previously preferred its HTTP remote address over
  the configured advertised address;
- Deadlock copied that value into the reservation and encoded one common
  `udp_connect_ip` for every Party member, which would strand LAN/Radmin peers.

Installed behavior:

- explicit Advertised IP now takes priority over a dedicated's registration
  source, so Hyper-V/WARP cannot overwrite `192.168.0.101`;
- each live GC session remembers its latest observed client route;
- every real Party account gets its own separately encoded type101 assignment;
- a LAN client receives the server interface on its subnet;
- a Radmin client receives the server's Radmin interface;
- a local client observed through one of the host's own interfaces is treated
  as local and receives the explicit advertised address instead of Hyper-V;
- mixed LAN/Radmin parties no longer share a single connection address;
- dedicated bind remains `0.0.0.0`, so all selected interfaces use the same
  reserved game port.

Offline verification on the current host:

- client `192.168.0.222` resolves to server `192.168.0.101`;
- client `26.1.2.3` resolves to server Radmin `26.163.159.89`;
- `172.31.192.1` is recognized as a local host interface, not a remote player;
- multiplayer harness passes the per-account encoding and advertised-IP
  precedence contracts;
- C# build passes with zero warnings and zero errors;
- production TypeSharp graph compiles with errors=0.

Live status:

- local match start confirmed the client address changed away from the stale
  Hyper-V `172.31.192.1` route and the match connected successfully;
- real mixed-machine LAN/Radmin acceptance remains pending until another client
  is available, but the routes are independently resolved before fanout.

## Web-controlled Deadlock advertised address V3.0 (installed, live pending)

Markers:

- SKYNET_DEADLOCK_WEB_ADVERTISED_IP_V30_SERVICE
- SKYNET_DEADLOCK_WEB_ADVERTISED_IP_V30_REGISTRATION
- SKYNET_DEADLOCK_WEB_ADVERTISED_IP_V30_LIVE

Installed behavior:

- DeadlockDedicatedServerSupervisor now receives the same live
  GameServerSettingsService used by Dota and the Admin Web panel;
- the Web panel's central Advertised IP is applied directly to new Deadlock
  registrations and refreshed whenever the GC reads a reservation;
- an address edit therefore applies without restarting SKYNET or the current
  dedicated process;
- empty/`auto` preserves the registered address as the supervisor fallback,
  while the V2.9 per-client resolver still selects the appropriate interface;
- only Advertised IP is shared. Deadlock retains its independent dedicated
  enable switch, bind address and `27125` port range, so Dota's `27025` Web
  controls cannot create a cross-game port collision.

Offline verification:

- the multiplayer harness passes the direct supervisor/Web-service wiring;
- the SKYNET C# compile target passes while the currently running server keeps
  the normal output executable locked;
- no client payload DLL or TypeScript GC message format changed in V3.0.
