using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using SKYNET_server.Models;
using Cs2AdjustEquipSlot = Cs2Proto.CMsgAdjustEquipSlot;
using Cs2AdjustEquipSlots = Cs2Proto.CMsgAdjustEquipSlots;
using Cs2ApplySticker = Cs2Proto.CMsgApplySticker;
using Cs2AccountCoPlays = Cs2Proto.CMsgGCCStrike15v2AccountRequestCoPlays;
using Cs2AcknowledgePenalty = Cs2Proto.CMsgGCCStrike15v2AcknowledgePenalty;
using Cs2CustomizationNotification = Cs2Proto.CMsgGCItemCustomizationNotification;
using Cs2EconAccount = Cs2Proto.CSOEconGameAccountClient;
using Cs2EconEquipSlot = Cs2Proto.CSOEconEquipSlot;
using Cs2EconItem = Cs2Proto.CSOEconItem;
using Cs2EventFavoritesRequest = Cs2Proto.CMsgGCCStrike15v2GetEventFavoritesRequest;
using Cs2EventFavoritesResponse = Cs2Proto.CMsgGCCStrike15v2GetEventFavoritesResponse;
using Cs2ItemAcknowledged = Cs2Proto.CMsgItemAcknowledged;
using Cs2MatchEndRunRewardDrops = Cs2Proto.CMsgGCCStrike15v2MatchEndRunRewardDrops;
using Cs2MatchList = Cs2Proto.CMsgGCCStrike15v2MatchList;
using Cs2MatchListRequestRecentUserGames = Cs2Proto.CMsgGCCStrike15v2MatchListRequestRecentUserGames;
using Cs2MatchListRequestTournamentGames = Cs2Proto.CMsgGCCStrike15v2MatchListRequestTournamentGames;
using Cs2MatchmakingClientHello = Cs2Proto.CMsgGCCStrike15v2MatchmakingGC2ClientHello;
using Cs2MatchmakingClientReserve = Cs2Proto.CMsgGCCStrike15v2MatchmakingGC2ClientReserve;
using Cs2MatchmakingStart = Cs2Proto.CMsgGCCStrike15v2MatchmakingStart;
using Cs2MatchmakingStop = Cs2Proto.CMsgGCCStrike15v2MatchmakingStop;
using Cs2OpenCrate = Cs2Proto.CMsgOpenCrate;
using Cs2PlayersProfile = Cs2Proto.CMsgGCCStrike15v2PlayersProfile;
using Cs2PremierSeasonSummary = Cs2Proto.CMsgGCCStrike15v2PremierSeasonSummary;
using Cs2PartySearch = Cs2Proto.CMsgGCCStrike15v2PartySearch;
using Cs2PartySearchResults = Cs2Proto.CMsgGCCStrike15v2PartySearchResults;
using Cs2PlayerDecalSign = Cs2Proto.CMsgGCCStrike15v2ClientPlayerDecalSign;
using Cs2PlayerDecalSignature = Cs2Proto.PlayerDecalDigitalSignature;
using Cs2PersonaDataPublic = Cs2Proto.CSOPersonaDataPublic;
using Cs2RankUpdate = Cs2Proto.CMsgGCCStrike15v2ClientGCRankUpdate;
using Cs2RecurringMissionSchema = Cs2Proto.CMsgRecurringMissionSchema;
using Cs2RequestRecurringMissionSchedule = Cs2Proto.CMsgRequestRecurringMissionSchedule;
using Cs2ServerReserve = Cs2Proto.CMsgGCCStrike15v2MatchmakingGC2ServerReserve;
using Cs2ServerReservationResponse = Cs2Proto.CMsgGCCStrike15v2MatchmakingServerReservationResponse;
using Cs2ServerClientValidate = Cs2Proto.CMsgGCCStrike15v2Server2GCClientValidate;
using Cs2SetItemPosition = Cs2Proto.CMsgSetItemPositions.ItemPosition;
using Cs2SetItemPositions = Cs2Proto.CMsgSetItemPositions;
using Cs2StoreGetUserData = Cs2Proto.CMsgStoreGetUserData;
using Cs2StoreGetUserDataResponse = Cs2Proto.CMsgStoreGetUserDataResponse;
using Cs2VolatileShopSubscribe = Cs2Proto.CMsgGCCStrike15v2VolatileShopSubscribe;

namespace SKYNET_server.Services;

public static class GcScriptSelfCheck
{
    private const uint DotaAppId = 570;
    private const uint Cs2AppId = 730;
    private const uint DeadlockAppId = 1422450;
    private const ulong TestSteamId = 76561197960287930UL;

    public static bool RunCs2(Action<string> write)
    {
        var contentRoot = ResolveContentRoot(Directory.GetCurrentDirectory());
        write($"CS2 GC self-check content root: {contentRoot}");
        var selfCheckRoot = Path.Combine(Path.GetTempPath(), "skynet-cs2-gc-selfcheck", Guid.NewGuid().ToString("N"));
        var inventoryDbPath = Path.Combine(selfCheckRoot, "cs2.db");
        Cs2GcRuntimeServices.UseInventoryStore(new Cs2InventoryStore(inventoryDbPath));
        Cs2GcRuntimeServices.UseMatchStore(new Cs2MatchStore(inventoryDbPath));

        var trace = new GameCoordinatorTraceService();
        var plugin = new GameCoordinatorScriptPlugin(
            new SelfCheckEnvironment(contentRoot),
            NullLogger<GameCoordinatorScriptPlugin>.Instance,
            trace);
        var context = new GameCoordinatorContext
        {
            AppId = Cs2AppId,
            SteamId = TestSteamId,
            AccountId = 15892202,
            PersonaName = "GcScriptSelfCheck CS2",
            ClientIp = "127.0.0.1"
        };
        var serverContext = new GameCoordinatorContext
        {
            AppId = Cs2AppId,
            SteamId = 85568392920027015UL,
            SessionSteamId = TestSteamId,
            AccountId = 0,
            PersonaName = "GcScriptSelfCheck CS2 Dedicated",
            ClientIp = "127.0.0.1"
        };

        var ok = ExpectCs2LegacyMatchStoreMigration(selfCheckRoot, write);
        ok &= ExpectCs2GameServerRegistrationFlow(plugin, serverContext, write);
        ok &= ExpectCs2BootstrapFlow(plugin, context, write);
        ok &= ExpectCs2InventoryScreenRequests(plugin, context, write);
        ok &= ExpectCs2EquipPersistenceFlow(plugin, context, serverContext, contentRoot, inventoryDbPath, write);
        ok &= ExpectCs2ItemCustomizationFlow(plugin, context, serverContext, write);
        ok &= ExpectCs2MatchmakingFlow(
            plugin,
            context,
            write,
            serverContext,
            contentRoot,
            inventoryDbPath);
        ok &= ExpectCs2MatchCompletionFlow(plugin, context, serverContext, write);
        foreach (var entry in trace.GetSince(0))
        {
            write($"trace {entry.Kind} app={entry.AppId} msg={entry.MessageType} size={entry.Size} {entry.Detail}");
        }

        write(ok ? "PASS" : "FAIL");
        return ok;
    }

    public static bool Run(Action<string> write)
    {
        var contentRoot = ResolveContentRoot(Directory.GetCurrentDirectory());
        write($"GC self-check content root: {contentRoot}");

        var trace = new GameCoordinatorTraceService();
        var plugin = new GameCoordinatorScriptPlugin(
            new SelfCheckEnvironment(contentRoot),
            NullLogger<GameCoordinatorScriptPlugin>.Instance,
            trace);

        var context = new GameCoordinatorContext
        {
            AppId = DotaAppId,
            SteamId = TestSteamId,
            AccountId = 15892202,
            PersonaName = "GcScriptSelfCheck",
            ClientIp = "127.0.0.1"
        };
        var serverContext = new GameCoordinatorContext
        {
            AppId = DotaAppId,
            SteamId = 85568397966950859UL,
            AccountId = 0,
            PersonaName = "GcScriptSelfCheck Dedicated",
            ClientIp = "192.168.212.252"
        };
        var friendContext = new GameCoordinatorContext
        {
            AppId = DotaAppId,
            SteamId = 76561197960287931UL,
            AccountId = 15892203,
            PersonaName = "GcScriptFriend",
            ClientIp = "192.168.212.253"
        };
        var cs2Context = new GameCoordinatorContext
        {
            AppId = Cs2AppId,
            SteamId = TestSteamId,
            AccountId = 15892202,
            PersonaName = "GcScriptSelfCheck CS2",
            ClientIp = "127.0.0.1"
        };
        var deadlockContext = new GameCoordinatorContext
        {
            AppId = DeadlockAppId,
            SteamId = TestSteamId,
            AccountId = 15892202,
            PersonaName = "GcScriptSelfCheck Deadlock",
            ClientIp = "127.0.0.1"
        };
        var queuedMessages = new List<(ulong SteamId, ApiGCMessage Message)>();
        var selfCheckDb = Path.Combine(Path.GetTempPath(), "skynet-gc-selfcheck", Guid.NewGuid().ToString("N"), "dota.db");
        var cs2SelfCheckDb = Path.Combine(Path.GetDirectoryName(selfCheckDb)!, "cs2.db");
        Cs2GcRuntimeServices.UseInventoryStore(new Cs2InventoryStore(cs2SelfCheckDb));
        Cs2GcRuntimeServices.UseMatchStore(new Cs2MatchStore(cs2SelfCheckDb));
        DotaStatsAccountIdentity? ResolveIdentity(uint accountId)
        {
            if (accountId == context.AccountId)
            {
                return new DotaStatsAccountIdentity(context.AccountId, context.SteamId, context.PersonaName);
            }

            if (accountId == friendContext.AccountId)
            {
                return new DotaStatsAccountIdentity(friendContext.AccountId, friendContext.SteamId, friendContext.PersonaName);
            }

            return null;
        }

        DotaGcRuntimeServices.StatsStore = new DotaStatsStore(selfCheckDb, ResolveIdentity);
        DotaGcRuntimeServices.GuildStore = new DotaGuildStore(selfCheckDb, ResolveIdentity);
        DotaGcRuntimeServices.PendingMessageQueued = (steamId, message) =>
            queuedMessages.Add((steamId, message));
        DotaGcRuntimeServices.TeamJsonProvider = teamId => teamId == 7733573
            ? """
              {
                "teamId":"7733573",
                "name":"SKYNET",
                "tag":"",
                "teamJson":"{\"teamLogo\":\"3255294647392078090\",\"teamBaseLogo\":\"7163376947542189088\",\"teamBannerLogo\":\"7954877705993612385\",\"teamLogoUrl\":\"\",\"teamAbbreviation\":\"\"}"
              }
              """
            : "{}";
        DotaGcRuntimeServices.TeamsForAccountJsonProvider = accountId => accountId == context.AccountId
            ? """
              [
                {
                  "teamId":"7733573",
                  "name":"SKYNET",
                  "tag":"",
                  "teamJson":"{\"teamLogo\":\"3255294647392078090\",\"teamBaseLogo\":\"7163376947542189088\",\"teamBannerLogo\":\"7954877705993612385\",\"teamLogoUrl\":\"\",\"teamAbbreviation\":\"\"}",
                  "role":1
                }
              ]
              """
            : "[]";
        var inventoryFixture = new SelfCheckInventoryFixture();
        DotaGcRuntimeServices.InventoryProvider = inventoryFixture.GetInventory;
        DotaGcRuntimeServices.EquipItemSink = inventoryFixture.EquipItem;
        DotaGcRuntimeServices.SetItemStyleSink = inventoryFixture.SetItemStyle;
        DotaGcRuntimeServices.ClientVersionProvider = () => 6860;
        SeedSocialMatchData(DotaGcRuntimeServices.StatsStore, context);

        var ok = true;
        ok &= ExpectSequence(plugin, context, 4006, new uint[] { 4009, 4004, 4009 }, write);
        ok &= ExpectWelcomeInventoryFlow(plugin, context, write);
        ok &= ExpectResponse(plugin, context, 2536, 2537, 1, write);
        ok &= ExpectResponse(plugin, context, 2581, 2582, 1, write);
        ok &= ExpectResponse(plugin, context, 2569, 2570, 1, write);
        ok &= ExpectResponse(plugin, context, 2577, 2578, 1, write);
        ok &= ExpectHandled(plugin, context, 2617, 0, write);
        ok &= ExpectResponse(plugin, context, 4501, 4502, 1, write);
        ok &= ExpectHandled(plugin, context, 4523, 0, write);
        ok &= ExpectResponse(plugin, context, 7009, 7010, 1, write);
        ok &= ExpectChatFlow(plugin, context, friendContext, queuedMessages, write);
        ok &= ExpectGameServerWelcomeFlow(plugin, serverContext, write);
        ok &= ExpectCreateLobbyFlow(plugin, context, write);
        ok &= ExpectLobbyDiscoveryFlow(plugin, friendContext, write);
        ok &= ExpectLobbyInviteFlow(plugin, context, queuedMessages, write);
        ok &= ExpectLobbyJoinFlow(plugin, context, friendContext, queuedMessages, write);
        ok &= ExpectLobbyTeamSlotFlow(plugin, context, friendContext, queuedMessages, write);
        ok &= ExpectApplyTeamFlow(plugin, context, friendContext, queuedMessages, write);
        ok &= ExpectLaunchFlow(plugin, context, friendContext, queuedMessages, write);
        ok &= ExpectDedicatedAttachFlow(plugin, context, friendContext, serverContext, queuedMessages, write);
        ok &= ExpectEquipVisibleCatalogItemFlow(plugin, context, serverContext.SteamId, queuedMessages, write);
        ok &= ExpectConnectedPlayersFlow(plugin, context, serverContext, queuedMessages, write);
        ok &= ExpectResponse(plugin, context, 7026, 7546, 1, write);
        ok &= ExpectResponse(plugin, context, 7072, 7087, 1, write);
        ok &= ExpectResponse(plugin, context, 7078, 7079, 1, write);
        ok &= ExpectResponse(plugin, context, 7082, 7083, 1, write);
        ok &= ExpectResponse(plugin, context, 7095, 7096, 1, write);
        ok &= ExpectSocialMatchDetails(plugin, context, 90000000000042UL, write);
        ok &= ExpectResponse(plugin, context, 7200, 7201, 1, write);
        ok &= ExpectResponse(plugin, context, 7274, 7275, 1, write);
        ok &= ExpectResponse(plugin, context, 7381, 7382, 1, write);
        ok &= ExpectResponse(plugin, context, 7387, 7388, 1, write);
        ok &= ExpectResponse(plugin, context, 7408, 7409, 1, write);
        ok &= ExpectResponse(plugin, context, 7427, 7428, 1, write);
        ok &= ExpectHandled(plugin, context, 7497, 0, write);
        ok &= ExpectResponse(plugin, context, 7503, 7504, 1, write);
        ok &= ExpectResponse(plugin, context, 7531, 7382, 1, write);
        ok &= ExpectResponse(plugin, context, 7536, 7537, 1, write);
        ok &= ExpectResponse(plugin, context, 7541, 7542, 1, write);
        ok &= ExpectResponse(plugin, context, 7543, 7544, 1, write);
        ok &= ExpectResponse(plugin, context, 7550, 7551, 1, write);
        ok &= ExpectResponse(plugin, context, 7552, 7553, 1, write);
        ok &= ExpectResponse(plugin, context, 7521, 7522, 1, write);
        ok &= ExpectResponse(plugin, context, 7527, 7528, 1, write);
        ok &= ExpectResponse(plugin, context, 7534, 7535, 1, write);
        ok &= ExpectResponse(plugin, context, 7538, 7539, 1, write);
        ok &= ExpectProfileCardAndUpdateFlow(plugin, context, write);
        ok &= ExpectResponse(plugin, context, 7584, 7586, 1, write);
        ok &= ExpectResponse(plugin, context, 7606, 7607, 1, write);
        ok &= ExpectResponse(plugin, context, 8078, 8079, 1, write);
        ok &= ExpectResponse(plugin, context, 8082, 8083, 1, write);
        ok &= ExpectResponse(plugin, context, 8095, 8096, 1, write);
        ok &= ExpectResponse(plugin, context, 8111, 8112, 1, write);
        ok &= ExpectResponse(plugin, context, 8113, 8114, 1, write);
        ok &= ExpectResponse(plugin, context, 8137, 8136, 1, write);
        ok &= ExpectResponse(plugin, context, 8211, 8212, 1, write);
        ok &= ExpectResponse(plugin, context, 8006, 8007, 1, write);
        ok &= ExpectResponse(plugin, context, 8009, 8010, 1, write);
        ok &= ExpectResponse(plugin, context, 8016, 8017, 1, write);
        ok &= ExpectSocialMatchPostComment(plugin, context, 90000000000042UL, write);
        ok &= ExpectRealtimePregameStats(plugin, serverContext, write);
        ok &= ExpectResponse(plugin, context, 8034, 8035, 1, write);
        ok &= ExpectResponse(plugin, context, 8073, 8074, 1, write);
        ok &= ExpectResponse(plugin, context, 8124, 8125, 1, write);
        ok &= ExpectHandled(plugin, context, 8255, 0, write);
        ok &= ExpectResponse(plugin, context, 8262, 8263, 1, write);
        ok &= ExpectResponse(plugin, context, 8268, 8269, 1, write);
        ok &= ExpectResponse(plugin, context, 8270, 8271, 1, write);
        ok &= ExpectResponse(plugin, context, 8274, 8275, 1, write);
        ok &= ExpectResponse(plugin, context, 8303, 8304, 1, write);
        ok &= ExpectResponse(plugin, context, 8305, 8306, 1, write);
        ok &= ExpectResponse(plugin, context, 8332, 8333, 1, write);
        ok &= ExpectResponse(plugin, context, 8334, 8335, 1, write);
        ok &= ExpectResponse(plugin, context, 8349, 8350, 1, write);
        ok &= ExpectResponse(plugin, context, 8676, 8677, 1, write);
        ok &= ExpectResponse(plugin, context, 8673, 8674, 1, write);
        ok &= ExpectResponse(plugin, context, 8687, 8688, 1, write);
        ok &= ExpectResponse(plugin, context, 8716, 8717, 1, write);
        ok &= ExpectHandled(plugin, context, 8718, 0, write);
        ok &= ExpectResponse(plugin, context, 8727, 8728, 1, write);
        ok &= ExpectResponse(plugin, context, 8729, 8730, 1, write);
        ok &= ExpectResponse(plugin, context, 8793, 8794, 1, write);
        ok &= ExpectResponse(plugin, context, 8798, 8799, 1, write);
        ok &= ExpectResponse(plugin, context, 8800, 8801, 1, write);
        ok &= ExpectResponse(plugin, context, 8851, 8852, 1, write);
        ok &= ExpectResponse(plugin, context, 8853, 8854, 1, write);
        ok &= ExpectResponse(plugin, context, 8879, 8880, 1, write);
        ok &= ExpectResponse(plugin, context, 8886, 8887, 1, write);
        ok &= ExpectResponse(plugin, context, 8944, 8945, 1, write);
        ok &= ExpectResponse(plugin, context, 9023, 9024, 1, write);
        ok &= ExpectDestroyedLobbyInviteReconnectFlow(plugin, context, friendContext, queuedMessages, write);
        ok &= ExpectUnhandled(plugin, context, 999999, write);
        ok &= ExpectCs2BootstrapFlow(plugin, cs2Context, write);
        ok &= ExpectCs2InventoryScreenRequests(plugin, cs2Context, write);
        ok &= ExpectCs2MatchmakingFlow(plugin, cs2Context, write);
        ok &= ExpectDeadlockBootstrapFlow(plugin, deadlockContext, write);

        foreach (var entry in trace.GetSince(0))
        {
            write($"trace {entry.Kind} app={entry.AppId} msg={entry.MessageType} size={entry.Size} {entry.Detail}");
        }

        write(ok ? "PASS" : "FAIL");
        return ok;
    }

    private static bool ExpectDeadlockBootstrapFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        const uint clientVersion = 6684;
        var request = new DeadlockClientHello
        {
            Version = clientVersion,
            ClientSessionNeed = 1
        };
        var response = plugin.Exchange(context, Request(4006, Serialize(request)));
        var messageTypes = response.Messages.Select(message => message.MessageType).ToArray();
        var welcomeMessage = response.Messages.SingleOrDefault(message => message.MessageType == 4004);
        var welcome = welcomeMessage == null
            ? null
            : Deserialize<DeadlockClientWelcome>(welcomeMessage.PayloadBase64);
        var gameData = welcome?.GameData is { Length: > 0 }
            ? DeserializeBytes<DeadlockClientWelcomeGameData>(welcome.GameData)
            : null;
        var serverHello = plugin.Exchange(context, Request(4007, Serialize(request)));
        var accountStats = plugin.Exchange(context, Request(9164));
        var profileCard = plugin.Exchange(context, Request(9024));
        var partyAction = plugin.Exchange(context, Request(9129));
        var serverUpdateMatchInfo = plugin.Exchange(context, Request(10041));
        var ok = response.Handled
            && messageTypes.Contains(4009u)
            && messageTypes.Contains(4004u)
            && welcome?.Version == clientVersion
            && gameData?.CompatibilityVersion == clientVersion
            && gameData.RegionMode == 1
            && gameData.PgiVerified
            && DeadlockGcRuntimeServices.GetClientCompatibilityVersion(context.AccountId) == clientVersion
            && serverHello.Handled
            && serverHello.Messages.Any(message => message.MessageType == 4005)
            && accountStats.Handled
            && accountStats.Messages.Any(message => message.MessageType == 9165)
            && profileCard.Handled
            && profileCard.Messages.Any(message => message.MessageType == 9025)
            && partyAction.Handled
            && partyAction.Messages.Any(message => message.MessageType == 9130)
            && serverUpdateMatchInfo.Handled
            && serverUpdateMatchInfo.Messages.Count == 0;

        write(
            $"Deadlock bootstrap -> handled={response.Handled}, messages=[{string.Join(',', messageTypes)}], " +
            $"welcomeVersion={welcome?.Version}, compatibilityVersion={gameData?.CompatibilityVersion}, " +
            $"region={gameData?.RegionMode}, pgi={gameData?.PgiVerified}, " +
            $"legacyRoutes=4007:{serverHello.Handled}/9164:{accountStats.Handled}/9024:{profileCard.Handled}/" +
            $"9129:{partyAction.Handled}/10041:{serverUpdateMatchInfo.Handled}, ok={ok}");
        return ok;
    }

    private static bool ExpectSequence(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        uint requestType,
        uint[] expectedResponseTypes,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(requestType));
        var actual = response.Messages.Select(message => message.MessageType).ToArray();
        var ok = response.Handled
            && actual.Length == expectedResponseTypes.Length
            && actual.SequenceEqual(expectedResponseTypes)
            && response.Messages.All(message => message.Protobuf);
        write($"{requestType} -> handled={response.Handled}, messages=[{string.Join(",", actual)}], ok={ok}");
        return ok;
    }

    private static bool ExpectResponse(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        uint requestType,
        uint expectedResponseType,
        int expectedCount,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(requestType));
        var matching = response.Messages.Count(message => message.MessageType == expectedResponseType && message.Protobuf);
        var ok = response.Handled && response.Messages.Count == expectedCount && matching == expectedCount;
        write($"{requestType} -> handled={response.Handled}, messages={response.Messages.Count}, expected={expectedResponseType}, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2BootstrapFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        var bootstrap = plugin.Exchange(context, Request(4006));
        var bootstrapTypes = bootstrap.Messages.Select(message => message.MessageType).ToArray();
        var welcomeMessage = bootstrap.Messages.FirstOrDefault(message => message.MessageType == 4004);
        var welcome = welcomeMessage == null ? null : Deserialize<Cs2ClientWelcome>(welcomeMessage.PayloadBase64);

        var helloResponse = plugin.Exchange(context, Request(9109));
        var helloMessage = helloResponse.Messages.SingleOrDefault(message => message.MessageType == 9110);
        var hello = helloMessage == null
            ? null
            : Deserialize<Cs2MatchmakingClientHello>(helloMessage.PayloadBase64);

        var profileResponse = plugin.Exchange(context, Request(9127));
        var profileMessage = profileResponse.Messages.SingleOrDefault(message => message.MessageType == 9128);
        var profile = profileMessage == null
            ? null
            : Deserialize<Cs2PlayersProfile>(profileMessage.PayloadBase64);
        var inventoryCache = welcome?.OutofdateSubscribedCaches.SingleOrDefault();
        var inventoryObjects = inventoryCache?.Objects.SingleOrDefault(item => item.TypeId == 1);
        var personaObjects = inventoryCache?.Objects.SingleOrDefault(item => item.TypeId == 2);
        var equipObjects = inventoryCache?.Objects.SingleOrDefault(item => item.TypeId == 3);
        var accountObjects = inventoryCache?.Objects.SingleOrDefault(item => item.TypeId == 7);
        var inventoryItems = inventoryObjects?.ObjectDatas
            .Select(DeserializeBytes<Cs2EconItem>)
            .ToArray() ?? Array.Empty<Cs2EconItem>();
        var account = accountObjects?.ObjectDatas.Count == 1
            ? DeserializeBytes<Cs2EconAccount>(accountObjects.ObjectDatas[0])
            : null;
        var persona = personaObjects?.ObjectDatas.Count == 1
            ? DeserializeBytes<Cs2PersonaDataPublic>(personaObjects.ObjectDatas[0])
            : null;
        var bootstrapHelloMessage = bootstrap.Messages.SingleOrDefault(message => message.MessageType == 9110);
        var bootstrapHello = bootstrapHelloMessage == null
            ? null
            : Deserialize<Cs2MatchmakingClientHello>(bootstrapHelloMessage.PayloadBase64);
        var bootstrapRankMessage = bootstrap.Messages.SingleOrDefault(message => message.MessageType == 9194);
        var bootstrapRank = bootstrapRankMessage == null
            ? null
            : Deserialize<Cs2RankUpdate>(bootstrapRankMessage.PayloadBase64);
        var catalog = Cs2GcRuntimeServices.ItemCatalog.Items;
        var inventoryMatchesCatalog = catalog.Count > 0
            ? inventoryItems.Length == catalog.Count &&
              inventoryItems.Select(item => item.DefIndex).SequenceEqual(catalog.Select(item => item.DefIndex)) &&
              inventoryItems.Zip(catalog).All(pair =>
                  pair.First.Attributes.Count == pair.Second.Attributes.Count &&
                  pair.First.Attributes.Zip(pair.Second.Attributes).All(attributePair =>
                      attributePair.First.DefIndex == attributePair.Second.DefIndex &&
                      ReadUInt32LittleEndian(attributePair.First.ValueBytes) == attributePair.Second.ValueBits))
            : inventoryItems.Select(item => item.DefIndex).SequenceEqual(new uint[] { 7, 9, 507 });

        var ok = bootstrap.Handled
            && bootstrapTypes.SequenceEqual(new uint[] { 4009, 4004, 4009, 9110, 9194 })
            && welcome != null
            && welcome.Rtime32GcWelcomeTimestamp != 0
            && inventoryCache?.OwnerSoid?.Type == 1
            && inventoryCache.OwnerSoid.Id == context.SteamId
            && inventoryMatchesCatalog
            && inventoryItems.All(item => item.AccountId == context.AccountId)
            && inventoryItems.All(item => item.Id != 0)
            && persona?.PlayerLevel == 1
            && persona.ElevatedState
            && account?.ElevatedState == 1
            && equipObjects != null
            && bootstrapHello?.AccountId == context.AccountId
            && bootstrapRank?.Rankings.SingleOrDefault()?.AccountId == context.AccountId
            && helloResponse.Handled
            && helloResponse.Messages.Count == 1
            && hello?.AccountId == context.AccountId
            && !hello.ShouldSerializePenaltySeconds()
            && !hello.ShouldSerializePenaltyReason()
            && hello.VacBanned == 0
            && hello.Ranking?.AccountId == context.AccountId
            && profileResponse.Handled
            && profileResponse.Messages.Count == 1
            && profile?.AccountProfiles.Count == 1
            && profile.AccountProfiles[0].AccountId == context.AccountId;

        write(
            $"CS2 bootstrap -> handled={bootstrap.Handled}, messages=[{string.Join(',', bootstrapTypes)}], " +
            $"inventoryItems={inventoryItems.Length}, personaSO={persona != null}, accountSO={account != null}, equipSO={equipObjects != null}, " +
            $"owner={inventoryCache?.OwnerSoid?.Id}, " +
            $"helloAccount={hello?.AccountId}, profileCount={profile?.AccountProfiles.Count ?? 0}, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2GameServerRegistrationFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        var request = new Cs2ServerHello
        {
            Version = 2000832,
            ClientLauncher = 3,
            SocacheControl = 1
        };
        var response = plugin.Exchange(context, Request(4007, Serialize(request)));
        var welcomeMessage = response.Messages.SingleOrDefault(message => message.MessageType == 4005);
        var welcome = welcomeMessage == null
            ? null
            : Deserialize<Cs2ClientWelcome>(welcomeMessage.PayloadBase64);
        var registration = Cs2GcRuntimeServices.RegisteredGameServer;
        var playerCache = welcome?.OutofdateSubscribedCaches
            .SingleOrDefault(cache => cache.OwnerSoid?.Id == context.SessionSteamId);
        var ok = response.Handled
            && response.Messages.Count == 1
            && welcome?.Version == request.Version
            && registration?.ServerId == context.SteamId
            && registration.SessionSteamId == context.SessionSteamId
            && playerCache != null
            && registration.Version == request.Version
            && registration.ServerAddress == "127.0.0.1:27015";

        write(
            $"CS2 game server registration -> handled={response.Handled}, welcomeVersion={welcome?.Version}, " +
            $"serverId={registration?.ServerId}, playerCache={playerCache != null}, address={registration?.ServerAddress}, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2InventoryScreenRequests(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        var shopRequest = new Cs2VolatileShopSubscribe
        {
            Defidx = 4040,
            Psid = context.SteamId
        };
        var shopResponse = plugin.Exchange(context, Request(9228, Serialize(shopRequest)));

        var recurringResponse = plugin.Exchange(
            context,
            Request(9225, Serialize(new Cs2RequestRecurringMissionSchedule())));
        var recurringMessage = recurringResponse.Messages.SingleOrDefault(message => message.MessageType == 9226);
        var recurring = recurringMessage == null
            ? null
            : Deserialize<Cs2RecurringMissionSchema>(recurringMessage.PayloadBase64);

        var storeResponse = plugin.Exchange(
            context,
            Request(2500, Serialize(new Cs2StoreGetUserData { Currency = 3 })));
        var storeMessage = storeResponse.Messages.SingleOrDefault(message => message.MessageType == 2501);
        var store = storeMessage == null
            ? null
            : Deserialize<Cs2StoreGetUserDataResponse>(storeMessage.PayloadBase64);

        var favoritesResponse = plugin.Exchange(
            context,
            Request(9201, Serialize(new Cs2EventFavoritesRequest { AllEvents = true })));
        var favoritesMessage = favoritesResponse.Messages.SingleOrDefault(message => message.MessageType == 9203);
        var favorites = favoritesMessage == null
            ? null
            : Deserialize<Cs2EventFavoritesResponse>(favoritesMessage.PayloadBase64);

        var rankRequest = new Cs2RankUpdate();
        rankRequest.Rankings.Add(new Cs2Proto.PlayerRankingInfo
        {
            AccountId = context.AccountId,
            RankTypeId = 6
        });
        var rankResponse = plugin.Exchange(context, Request(9194, Serialize(rankRequest)));
        var rankMessage = rankResponse.Messages.SingleOrDefault(message => message.MessageType == 9194);
        var rank = rankMessage == null
            ? null
            : Deserialize<Cs2RankUpdate>(rankMessage.PayloadBase64);

        var tournamentResponse = plugin.Exchange(
            context,
            Request(9146, Serialize(new Cs2MatchListRequestTournamentGames { Eventid = 0 })));
        var tournamentMessage = tournamentResponse.Messages.SingleOrDefault(message => message.MessageType == 9139);
        var tournament = tournamentMessage == null
            ? null
            : Deserialize<Cs2MatchList>(tournamentMessage.PayloadBase64);

        var recentResponse = plugin.Exchange(
            context,
            Request(9141, Serialize(new Cs2MatchListRequestRecentUserGames { Accountid = context.AccountId })));
        var recentMessage = recentResponse.Messages.SingleOrDefault(message => message.MessageType == 9139);
        var recent = recentMessage == null
            ? null
            : Deserialize<Cs2MatchList>(recentMessage.PayloadBase64);

        var coPlaysResponse = plugin.Exchange(context, Request(9193, Serialize(new Cs2AccountCoPlays())));
        var coPlaysMessage = coPlaysResponse.Messages.SingleOrDefault(message => message.MessageType == 9193);
        var coPlays = coPlaysMessage == null
            ? null
            : Deserialize<Cs2AccountCoPlays>(coPlaysMessage.PayloadBase64);

        var partySearchResponse = plugin.Exchange(
            context,
            Request(9191, Serialize(new Cs2PartySearch { Ver = 14177, Apr = 1, GameType = 8 })));
        var partySearchMessage = partySearchResponse.Messages.SingleOrDefault(message => message.MessageType == 9191);
        var partySearch = partySearchMessage == null
            ? null
            : Deserialize<Cs2PartySearchResults>(partySearchMessage.PayloadBase64);

        var predictionsResponse = plugin.Exchange(
            context,
            Request(9160, Serialize(new Cs2TournamentPredictions { Eventid = 26 })));
        var predictionsMessage = predictionsResponse.Messages.SingleOrDefault(message => message.MessageType == 9160);
        var predictions = predictionsMessage == null
            ? null
            : Deserialize<Cs2TournamentPredictions>(predictionsMessage.PayloadBase64);
        var penaltyResponse = plugin.Exchange(
            context,
            Request(9171, Serialize(new Cs2AcknowledgePenalty { Acknowledged = 1 })));
        var premierResponse = plugin.Exchange(
            context,
            Request(9224, Serialize(new Cs2PremierSeasonSummary
            {
                AccountId = context.AccountId,
                SeasonId = 14
            })));
        var premierMessage = premierResponse.Messages.SingleOrDefault(message => message.MessageType == 9224);
        var premier = premierMessage == null
            ? null
            : Deserialize<Cs2PremierSeasonSummary>(premierMessage.PayloadBase64);

        var ok = shopResponse.Handled
            && shopResponse.Messages.Count == 0
            && recurringResponse.Handled
            && recurringResponse.Messages.Count == 1
            && recurring?.Missions.Count == 0
            && storeResponse.Handled
            && storeResponse.Messages.Count == 1
            && store?.Result == 1
            && store.CurrencyDeprecated == 3
            && favoritesResponse.Handled
            && favoritesResponse.Messages.Count == 1
            && favorites?.JsonFavorites == "[]"
            && rankResponse.Handled
            && rankResponse.Messages.Count == 1
            && rank?.Rankings.Count == 1
            && rank.Rankings[0].AccountId == context.AccountId
            && rank.Rankings[0].RankTypeId == 6
            && rank.Rankings[0].RankId == 1
            && tournamentResponse.Handled
            && tournamentResponse.Messages.Count == 1
            && tournament?.Msgrequestid == 9146
            && tournament.Accountid == context.AccountId
            && tournament.Servertime != 0
            && tournament.Matches.Count == 0
            && recentResponse.Handled
            && recentResponse.Messages.Count == 1
            && recent?.Msgrequestid == 9141
            && recent.Accountid == context.AccountId
            && coPlaysResponse.Handled
            && coPlaysResponse.Messages.Count == 1
            && coPlays?.Players.Count == 0
            && coPlays.Servertime != 0
            && partySearchResponse.Handled
            && partySearchResponse.Messages.Count == 1
            && partySearch?.Entries.Count == 0
            && predictionsResponse.Handled
            && predictionsResponse.Messages.Count == 1
            && predictions?.Eventid == 26
            && penaltyResponse.Handled
            && penaltyResponse.Messages.Count == 0
            && premierResponse.Handled
            && premierResponse.Messages.Count == 1
            && premier?.AccountId == context.AccountId
            && premier.SeasonId == 14
            && premier.DataPerWeeks.Count == 0
            && premier.DataPerMaps.Count == 0;

        write(
            $"CS2 inventory screen requests -> shopSubscription={shopResponse.Handled}/9228/noReply={shopResponse.Messages.Count == 0}, " +
            $"bootstrap=[9226:{recurringResponse.Handled},2501:{storeResponse.Handled},9203:{favoritesResponse.Handled}], " +
            $"social=[9141:{recentResponse.Handled},9193:{coPlaysResponse.Handled},9191:{partySearchResponse.Handled},9160:{predictionsResponse.Handled}], " +
            $"rank={rankResponse.Handled}/9194, tournaments={tournamentResponse.Handled}/9139, " +
            $"penaltyAck={penaltyResponse.Handled}/9171, premier={premierResponse.Handled}/9224, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2LegacyMatchStoreMigration(string selfCheckRoot, Action<string> write)
    {
        var legacyPath = Path.Combine(selfCheckRoot, "legacy-cs2.db");
        Directory.CreateDirectory(selfCheckRoot);
        using (var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={legacyPath}"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE cs2_match_players (
                    reservation_id TEXT NOT NULL,
                    account_id INTEGER NOT NULL,
                    PRIMARY KEY (reservation_id, account_id)
                );
                """;
            command.ExecuteNonQuery();
        }

        _ = new Cs2MatchStore(legacyPath);
        var hasSteamId = false;
        using (var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={legacyPath}"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA table_info(cs2_match_players);";
            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                hasSteamId |= string.Equals(
                    reader.GetString(1),
                    "steam_id",
                    StringComparison.OrdinalIgnoreCase);
            }
        }

        write($"CS2 legacy match-store migration -> steamIdColumn={hasSteamId}, ok={hasSteamId}");
        return hasSteamId;
    }

    private static bool ExpectCs2MatchmakingFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write,
        GameCoordinatorContext? serverContext = null,
        string? contentRoot = null,
        string? databasePath = null)
    {
        var request = new Cs2MatchmakingStart
        {
            GameType = 8,
            ClientVersion = 2000832,
            AccountIds = new[] { context.AccountId }
        };

        var response = plugin.Exchange(context, Request(9101, Serialize(request)));
        var messageTypes = response.Messages.Select(message => message.MessageType).ToArray();
        var reserveMessage = response.Messages.SingleOrDefault(message => message.MessageType == 9107);
        var reserve = reserveMessage == null
            ? null
            : Deserialize<Cs2MatchmakingClientReserve>(reserveMessage.PayloadBase64);
        var storedPending = Cs2GcRuntimeServices.GetOngoingReservation(context.AccountId);
        var reconnectBeforeConfirmation = plugin.Exchange(context, Request(9109));
        var reconnectBeforeMessage = reconnectBeforeConfirmation.Messages
            .SingleOrDefault(message => message.MessageType == 9110);
        var reconnectBefore = reconnectBeforeMessage == null
            ? null
            : Deserialize<Cs2MatchmakingClientHello>(reconnectBeforeMessage.PayloadBase64);

        var extended = serverContext != null
            && !string.IsNullOrWhiteSpace(contentRoot)
            && !string.IsNullOrWhiteSpace(databasePath)
            && reserve != null;
        ApiGCExchangeResponse? confirmation = null;
        Cs2ServerReserve? queuedServerReservation = null;
        Cs2ActiveReservation? storedConfirmed = null;
        Cs2MatchmakingClientHello? reconnectAfterRestart = null;
        ApiGCExchangeResponse? abandon = null;
        Cs2ActiveReservation? storedAfterAbandon = storedPending;
        Cs2MatchmakingClientHello? helloAfterAbandon = null;
        GameCoordinatorScriptPlugin activePlugin = plugin;

        if (extended)
        {
            var serverPoll = plugin.Poll(serverContext!);
            var queuedServerMessage = serverPoll.Messages
                .SingleOrDefault(message => message.MessageType == 9105);
            queuedServerReservation = queuedServerMessage == null
                ? null
                : Deserialize<Cs2ServerReserve>(queuedServerMessage.PayloadBase64);

            var serverResponse = new Cs2ServerReservationResponse
            {
                Reservationid = reserve!.Reservationid,
                Reservation = reserve.Reservation,
                Map = reserve.Map,
                GcReservationSent = reserve.Reservationid,
                ServerVersion = reserve.Reservation?.ServerVersion ?? 0
            };
            confirmation = plugin.Exchange(serverContext!, Request(9106, Serialize(serverResponse)));
            storedConfirmed = Cs2GcRuntimeServices.GetOngoingReservation(context.AccountId);

            Cs2GcRuntimeServices.UseMatchStore(new Cs2MatchStore(databasePath!));
            activePlugin = new GameCoordinatorScriptPlugin(
                new SelfCheckEnvironment(contentRoot!),
                NullLogger<GameCoordinatorScriptPlugin>.Instance,
                new GameCoordinatorTraceService());
            var restartedHelloResponse = activePlugin.Exchange(context, Request(9109));
            var restartedHelloMessage = restartedHelloResponse.Messages
                .SingleOrDefault(message => message.MessageType == 9110);
            reconnectAfterRestart = restartedHelloMessage == null
                ? null
                : Deserialize<Cs2MatchmakingClientHello>(restartedHelloMessage.PayloadBase64);

            abandon = activePlugin.Exchange(
                context,
                Request(9102, Serialize(new Cs2MatchmakingStop { Abandon = 1 })));
            storedAfterAbandon = Cs2GcRuntimeServices.GetOngoingReservation(context.AccountId);
            var clearedHelloResponse = activePlugin.Exchange(context, Request(9109));
            var clearedHelloMessage = clearedHelloResponse.Messages
                .SingleOrDefault(message => message.MessageType == 9110);
            helloAfterAbandon = clearedHelloMessage == null
                ? null
                : Deserialize<Cs2MatchmakingClientHello>(clearedHelloMessage.PayloadBase64);
        }

        var stop = extended
            ? abandon!
            : activePlugin.Exchange(context, Request(9102));
        var ping = activePlugin.Exchange(context, Request(9103));

        var ok = response.Handled
            && messageTypes.SequenceEqual(new uint[] { 9104, 9107, 9104 })
            && reserve?.ServerAddress == "127.0.0.1:27015"
            && reserve.Serverid == (Cs2GcRuntimeServices.RegisteredGameServer?.ServerId
                ?? Cs2GcRuntimeServices.ServerId)
            && reserve.DirectUdpPort == 27015
            && reserve.Reservationid != 0
            && reserve.Reservation?.AccountIds.SequenceEqual(new[] { context.AccountId }) == true
            && reserve.Reservation.MatchId != 0
            && reserve.Reservation.GameType == 8
            && storedPending?.ReservationId == reserve.Reservationid
            && storedPending.State == Cs2ReservationState.Pending
            && reconnectBefore?.Ongoingmatch?.Reservationid == reserve.Reservationid
            && stop.Handled
            && stop.Messages.Count == 1
            && stop.Messages[0].MessageType == 9104
            && ping.Handled
            && ping.Messages.Count == 1
            && ping.Messages[0].MessageType == 9104;

        if (extended)
        {
            ok = ok
                && confirmation?.Handled == true
                && confirmation.Messages.Count == 0
                && queuedServerReservation != null
                && queuedServerReservation.MatchId == reserve!.Reservation?.MatchId
                && queuedServerReservation.AccountIds.SequenceEqual(new[] { context.AccountId })
                && storedConfirmed?.ReservationId == reserve!.Reservationid
                && storedConfirmed.State == Cs2ReservationState.Confirmed
                && reconnectAfterRestart?.Ongoingmatch?.Reservationid == reserve.Reservationid
                && storedAfterAbandon == null
                && helloAfterAbandon?.Ongoingmatch == null;
        }

        write(
            $"CS2 matchmaking -> handled={response.Handled}, messages=[{string.Join(',', messageTypes)}], " +
            $"address={reserve?.ServerAddress}, reservation={reserve?.Reservationid}, " +
            $"pending={storedPending?.State}, confirmed={storedConfirmed?.State}, " +
            $"serverQueued={queuedServerReservation?.MatchId}, " +
            $"restartReservation={reconnectAfterRestart?.Ongoingmatch?.Reservationid}, " +
            $"cleared={storedAfterAbandon == null}, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2MatchCompletionFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext serverContext,
        Action<string> write)
    {
        var start = plugin.Exchange(
            context,
            Request(9101, Serialize(new Cs2MatchmakingStart
            {
                GameType = 8,
                ClientVersion = 2000832,
                AccountIds = new[] { context.AccountId }
            })));
        var reserveMessage = start.Messages.SingleOrDefault(message => message.MessageType == 9107);
        var reserve = reserveMessage == null
            ? null
            : Deserialize<Cs2MatchmakingClientReserve>(reserveMessage.PayloadBase64);
        if (reserve == null)
        {
            write("CS2 match completion -> no client reservation, ok=False");
            return false;
        }

        var serverPoll = plugin.Poll(serverContext);
        var queuedReservation = serverPoll.Messages
            .SingleOrDefault(message => message.MessageType == 9105);
        var serverResponse = new Cs2ServerReservationResponse
        {
            Reservationid = reserve.Reservationid,
            Reservation = reserve.Reservation,
            Map = reserve.Map,
            GcReservationSent = reserve.Reservationid,
            ServerVersion = reserve.Reservation?.ServerVersion ?? 0
        };
        var confirmation = plugin.Exchange(
            serverContext,
            Request(9106, Serialize(serverResponse)));

        // A hello from the active player binds its account id to the current
        // SteamID so asynchronous match-end updates have an exact destination.
        var activeHello = plugin.Exchange(context, Request(9109));
        var matchEndRequest = new Cs2MatchEndRunRewardDrops { Serverinfo = serverResponse };

        var rogueServer = new GameCoordinatorContext
        {
            AppId = Cs2AppId,
            SteamId = serverContext.SteamId + 1,
            AccountId = 0,
            PersonaName = "GcScriptSelfCheck CS2 Rogue Dedicated",
            ClientIp = serverContext.ClientIp
        };
        var rejectedFinish = plugin.Exchange(
            rogueServer,
            Request(9136, Serialize(matchEndRequest)));
        var retainedAfterRogue = Cs2GcRuntimeServices.GetOngoingReservation(context.AccountId);

        var finish = plugin.Exchange(
            serverContext,
            Request(9136, Serialize(matchEndRequest)));
        var storedAfterFinish = Cs2GcRuntimeServices.GetOngoingReservation(context.AccountId);
        var clientPoll = plugin.Poll(context);
        var clientMessageTypes = clientPoll.Messages.Select(message => message.MessageType).ToArray();
        var rankMessage = clientPoll.Messages.SingleOrDefault(message => message.MessageType == 9194);
        var rank = rankMessage == null ? null : Deserialize<Cs2RankUpdate>(rankMessage.PayloadBase64);
        var clearedHelloResponse = plugin.Exchange(context, Request(9109));
        var clearedHelloMessage = clearedHelloResponse.Messages
            .SingleOrDefault(message => message.MessageType == 9110);
        var clearedHello = clearedHelloMessage == null
            ? null
            : Deserialize<Cs2MatchmakingClientHello>(clearedHelloMessage.PayloadBase64);

        var ok = start.Handled
            && queuedReservation != null
            && confirmation.Handled
            && confirmation.Messages.Count == 0
            && activeHello.Handled
            && rejectedFinish.Handled
            && rejectedFinish.Messages.Count == 0
            && retainedAfterRogue?.ReservationId == reserve.Reservationid
            && finish.Handled
            && finish.Messages.Count == 0
            && storedAfterFinish == null
            && clientMessageTypes.SequenceEqual(new uint[] { 9104, 9194 })
            && rank?.Rankings.Count == 1
            && rank.Rankings[0].AccountId == context.AccountId
            && clearedHello?.Ongoingmatch == null;

        write(
            $"CS2 match completion -> reservation={reserve.Reservationid}, " +
            $"rogueRetained={retainedAfterRogue != null}, queued=[{string.Join(',', clientMessageTypes)}], " +
            $"cleared={storedAfterFinish == null}, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2EquipPersistenceFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext serverContext,
        string contentRoot,
        string inventoryDbPath,
        Action<string> write)
    {
        var itemId = 0x7300000000000000UL | ((context.SteamId & 0xffffffffUL) << 16) | 1UL;
        var request = new Cs2AdjustEquipSlots { ChangeNum = 1 };
        request.Slots.Add(new Cs2AdjustEquipSlot
        {
            ClassId = 2,
            SlotId = 15,
            ItemId = itemId
        });

        var response = plugin.Exchange(context, Request(2531, Serialize(request)));
        var updateMessage = response.Messages.SingleOrDefault(message => message.MessageType == 26);
        var update = updateMessage == null
            ? null
            : Deserialize<CMsgSOMultipleObjects>(updateMessage.PayloadBase64);
        var updatedItems = update?.ObjectsModifieds
            .Where(item => item.TypeId == 1)
            .Select(item => DeserializeBytes<Cs2EconItem>(item.ObjectData))
            .ToArray() ?? Array.Empty<Cs2EconItem>();
        var updatedAk = updatedItems.SingleOrDefault(item => item.Id == itemId);
        var updatedEquipSlot = update?.ObjectsModifieds
            .Where(item => item.TypeId == 3)
            .Select(item => DeserializeBytes<Cs2EconEquipSlot>(item.ObjectData))
            .SingleOrDefault();
        var serverPoll = plugin.Poll(serverContext);
        var serverCacheMessage = serverPoll.Messages
            .SingleOrDefault(message => message.MessageType == 24);
        var serverCache = serverCacheMessage == null
            ? null
            : Deserialize<CMsgSOCacheSubscribed>(serverCacheMessage.PayloadBase64);
        var serverItem = serverCache?.Objects
            .Where(type => type.TypeId == 1)
            .SelectMany(type => type.ObjectDatas)
            .Select(DeserializeBytes<Cs2EconItem>)
            .SingleOrDefault(item => item.Id == itemId);
        var serverEquipSlot = serverCache?.Objects
            .Where(type => type.TypeId == 3)
            .SelectMany(type => type.ObjectDatas)
            .Select(DeserializeBytes<Cs2EconEquipSlot>)
            .SingleOrDefault(slot => slot.ClassId == 2 && slot.SlotId == 15);
        var validationResponse = plugin.Exchange(
            serverContext,
            Request(9153, Serialize(new Cs2ServerClientValidate
            {
                Accountid = AccountIdFromSteamId(context.SteamId)
            })));
        var validationCacheMessage = validationResponse.Messages
            .SingleOrDefault(message => message.MessageType == 24);
        var validationCache = validationCacheMessage == null
            ? null
            : Deserialize<CMsgSOCacheSubscribed>(validationCacheMessage.PayloadBase64);
        var validatedItem = validationCache?.Objects
            .Where(type => type.TypeId == 1)
            .SelectMany(type => type.ObjectDatas)
            .Select(DeserializeBytes<Cs2EconItem>)
            .SingleOrDefault(item => item.Id == itemId);

        var positionRequest = new Cs2SetItemPositions();
        positionRequest.ItemPositions.Add(new Cs2SetItemPosition { ItemId = itemId, Position = 42 });
        var positionResponse = plugin.Exchange(context, Request(1077, Serialize(positionRequest)));

        var refreshRequest = new CMsgSOCacheSubscriptionRefresh
        {
            OwnerSoid = new CMsgSOIDOwner { Type = 1, Id = context.SteamId }
        };
        var refreshResponse = plugin.Exchange(context, Request(28, Serialize(refreshRequest)));
        var refreshedCacheMessage = refreshResponse.Messages.SingleOrDefault(message => message.MessageType == 24);
        var refreshedCache = refreshedCacheMessage == null
            ? null
            : Deserialize<CMsgSOCacheSubscribed>(refreshedCacheMessage.PayloadBase64);
        var refreshedAk = refreshedCache?.Objects
            .Where(type => type.TypeId == 1)
            .SelectMany(type => type.ObjectDatas)
            .Select(DeserializeBytes<Cs2EconItem>)
            .SingleOrDefault(item => item.Id == itemId);

        var verifyResponse = plugin.Exchange(context, Request(1005));
        var acknowledgeResponse = plugin.Exchange(
            context,
            Request(1087, Serialize(new Cs2ItemAcknowledged())));

        var invalidRequest = new Cs2AdjustEquipSlots { ChangeNum = 2 };
        invalidRequest.Slots.Add(new Cs2AdjustEquipSlot
        {
            ClassId = 3,
            SlotId = 15,
            ItemId = (itemId & ~0xFFFFUL) | 0xFFFFUL
        });
        var invalidResponse = plugin.Exchange(context, Request(2531, Serialize(invalidRequest)));
        var stored = Cs2GcRuntimeServices.GetEquipment(context.SteamId);

        // Re-open the database and rebuild the script runtime. This proves the
        // loadout is not merely retained in TypeScript memory.
        Cs2GcRuntimeServices.UseInventoryStore(new Cs2InventoryStore(inventoryDbPath));
        var restarted = new GameCoordinatorScriptPlugin(
            new SelfCheckEnvironment(contentRoot),
            NullLogger<GameCoordinatorScriptPlugin>.Instance,
            new GameCoordinatorTraceService());
        var reconnect = restarted.Exchange(context, Request(4006));
        var welcomeMessage = reconnect.Messages.SingleOrDefault(message => message.MessageType == 4004);
        var welcome = welcomeMessage == null ? null : Deserialize<Cs2ClientWelcome>(welcomeMessage.PayloadBase64);
        var reloadedItems = welcome?.OutofdateSubscribedCaches
            .SelectMany(cache => cache.Objects)
            .Where(type => type.TypeId == 1)
            .SelectMany(type => type.ObjectDatas)
            .Select(DeserializeBytes<Cs2EconItem>)
            .ToArray() ?? Array.Empty<Cs2EconItem>();
        var reloadedAk = reloadedItems.SingleOrDefault(item => item.Id == itemId);

        var currentCacheVersion = Math.Max(stored.Version, Cs2GcRuntimeServices.ItemCatalog.Version);
        var currentHello = new Cs2ClientHello { Version = 1, ClientSessionNeed = 1 };
        currentHello.SocacheHaveVersions.Add(new CMsgSOCacheHaveVersion
        {
            Soid = new CMsgSOIDOwner { Type = 1, Id = context.SteamId },
            Version = currentCacheVersion
        });
        var currentResponse = restarted.Exchange(context, Request(4006, Serialize(currentHello)));
        var currentWelcomeMessage = currentResponse.Messages.SingleOrDefault(message => message.MessageType == 4004);
        var currentWelcome = currentWelcomeMessage == null
            ? null
            : Deserialize<Cs2ClientWelcome>(currentWelcomeMessage.PayloadBase64);

        var staleHello = new Cs2ClientHello { Version = 1 };
        staleHello.SocacheHaveVersions.Add(new CMsgSOCacheHaveVersion
        {
            Soid = new CMsgSOIDOwner { Type = 1, Id = context.SteamId },
            Version = currentCacheVersion - 1
        });
        var staleResponse = restarted.Exchange(context, Request(4006, Serialize(staleHello)));
        var staleWelcomeMessage = staleResponse.Messages.SingleOrDefault(message => message.MessageType == 4004);
        var staleWelcome = staleWelcomeMessage == null
            ? null
            : Deserialize<Cs2ClientWelcome>(staleWelcomeMessage.PayloadBase64);

        var ok = response.Handled
            && response.Messages.Count == 1
            && update != null
            && update.OwnerSoid?.Id == context.SteamId
            && updatedAk?.EquippedStates.Count == 1
            && updatedAk.EquippedStates[0].NewClass == 2
            && updatedAk.EquippedStates[0].NewSlot == 15
            && updatedEquipSlot?.AccountId == context.AccountId
            && updatedEquipSlot.ClassId == 2
            && updatedEquipSlot.SlotId == 15
            && updatedEquipSlot.ItemId == itemId
            && serverPoll.Messages.Count == 1
            && serverCache?.OwnerSoid?.Id == context.SteamId
            && serverItem?.EquippedStates.Count == 1
            && serverItem.EquippedStates[0].NewClass == 2
            && serverItem.EquippedStates[0].NewSlot == 15
            && serverEquipSlot?.AccountId == context.AccountId
            && serverEquipSlot.ItemId == itemId
            && validationResponse.Handled
            && validationResponse.Messages.Count == 1
            && validationCache?.OwnerSoid?.Id == context.SteamId
            && validatedItem?.EquippedStates.Count == 1
            && validatedItem.EquippedStates[0].NewClass == 2
            && validatedItem.EquippedStates[0].NewSlot == 15
            && positionResponse.Handled
            && positionResponse.Messages.Count == 1
            && positionResponse.Messages[0].MessageType == 26
            && refreshResponse.Handled
            && refreshResponse.Messages.Count == 1
            && refreshedAk?.Inventory == 42
            && verifyResponse.Handled
            && verifyResponse.Messages.Count == 1
            && verifyResponse.Messages[0].MessageType == 24
            && acknowledgeResponse.Handled
            && acknowledgeResponse.Messages.Count == 0
            && invalidResponse.Handled
            && invalidResponse.Messages.Count == 0
            && stored.Version >= 3
            && stored.Bindings.SingleOrDefault()?.ItemId == itemId
            && stored.Positions.SingleOrDefault()?.Position == 42
            && reconnect.Handled
            && reloadedAk?.EquippedStates.Count == 1
            && reloadedAk.EquippedStates[0].NewClass == 2
            && reloadedAk.EquippedStates[0].NewSlot == 15
            && reloadedAk.Inventory == 42
            && currentResponse.Handled
            && currentWelcome?.OutofdateSubscribedCaches.Count == 0
            && currentWelcome.UptodateSubscribedCaches.Count == 1
            && currentWelcome.UptodateSubscribedCaches[0].Version == currentCacheVersion
            && staleResponse.Handled
            && staleWelcome?.OutofdateSubscribedCaches.Count == 1
            && staleWelcome.UptodateSubscribedCaches.Count == 0;

        write(
            $"CS2 equip persistence -> handled={response.Handled}, updateItems={updatedItems.Length}, updateSlot={updatedEquipSlot != null}, " +
            $"serverCaches={serverPoll.Messages.Count}, serverItem={serverItem != null}, serverSlot={serverEquipSlot != null}, " +
            $"validatedItem={validatedItem != null}, " +
            $"storedVersion={stored.Version}, storedBindings={stored.Bindings.Count}, " +
            $"storedPositions={stored.Positions.Count}, refreshedPosition={refreshedAk?.Inventory}, " +
            $"currentCaches={currentWelcome?.UptodateSubscribedCaches.Count}, staleCaches={staleWelcome?.OutofdateSubscribedCaches.Count}, " +
            $"reloadedClass={reloadedAk?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"reloadedSlot={reloadedAk?.EquippedStates.FirstOrDefault()?.NewSlot}, ok={ok}");
        return ok;
    }

    private static bool ExpectCs2ItemCustomizationFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext serverContext,
        Action<string> write)
    {
        var catalog = Cs2GcRuntimeServices.ItemCatalog.Items;
        var stickerIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "sticker").index;
        var patchIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "patch").index;
        var keychainIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "keychain").index;
        var graffitiIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "graffiti").index;
        var weaponIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "weapon").index;
        var agentIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "agent").index;
        var stickerCapsuleIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "sticker_capsule").index;
        var caseIndex = catalog.Select((item, index) => (item, index))
            .FirstOrDefault(entry => entry.item.Category == "case").index;
        var requiredCategoriesExist = catalog.Count > 0
            && catalog[stickerIndex].Category == "sticker"
            && catalog[patchIndex].Category == "patch"
            && catalog[keychainIndex].Category == "keychain"
            && catalog[graffitiIndex].Category == "graffiti"
            && catalog[weaponIndex].Category == "weapon"
            && catalog[agentIndex].Category == "agent"
            && catalog[stickerCapsuleIndex].Category == "sticker_capsule"
            && catalog[caseIndex].Category == "case";
        if (!requiredCategoriesExist)
        {
            write("CS2 item customization -> skipped (fallback catalog)");
            return true;
        }

        ulong ItemIdAt(int index) =>
            0x7300000000000000UL | ((context.SteamId & 0xffffffffUL) << 16) | (uint)(index + 1);

        var operations = new[]
        {
            (SourceIndex: stickerIndex, TargetIndex: weaponIndex, Slot: 2U, TargetAttribute: 121U),
            (SourceIndex: patchIndex, TargetIndex: agentIndex, Slot: 0U, TargetAttribute: 113U),
            (SourceIndex: keychainIndex, TargetIndex: weaponIndex, Slot: 0U, TargetAttribute: 299U)
        };
        var applied = true;
        var positioned = true;
        foreach (var operation in operations)
        {
            var source = catalog[operation.SourceIndex];
            var sourceAttribute = source.Category == "keychain" ? 299U : 113U;
            var kitId = source.Attributes.Single(attribute => attribute.DefIndex == sourceAttribute).ValueBits;
            var targetItemId = ItemIdAt(operation.TargetIndex);
            var response = plugin.Exchange(context, Request(1086, Serialize(new Cs2ApplySticker
            {
                StickerItemId = ItemIdAt(operation.SourceIndex),
                ItemItemId = targetItemId,
                StickerSlot = operation.Slot,
                StickerWear = 0.05F,
                StickerRotation = 12.5F,
                StickerScale = 0.85F,
                StickerOffsetX = 0.25F,
                StickerOffsetY = -0.5F,
                StickerOffsetZ = 0.75F
            })));
            var updateMessage = response.Messages.SingleOrDefault(message => message.MessageType == 26);
            var update = updateMessage == null
                ? null
                : Deserialize<CMsgSOMultipleObjects>(updateMessage.PayloadBase64);
            var target = update?.ObjectsModifieds
                .Where(item => item.TypeId == 1)
                .Select(item => DeserializeBytes<Cs2EconItem>(item.ObjectData))
                .SingleOrDefault(item => item.Id == targetItemId);
            var targetValue = target?.Attributes
                .Where(attribute => attribute.DefIndex == operation.TargetAttribute)
                .Select(attribute => ReadUInt32LittleEndian(attribute.ValueBytes))
                .SingleOrDefault();
            var storedValue = Cs2GcRuntimeServices.GetEquipment(context.SteamId).ItemAttributes
                .Where(attribute => attribute.ItemId == targetItemId && attribute.DefIndex == operation.TargetAttribute)
                .Select(attribute => attribute.ValueBits)
                .SingleOrDefault();
            var positionAttribute = source.Category == "keychain" ? 300U : 278U + operation.Slot * 2U;
            var storedPosition = Cs2GcRuntimeServices.GetEquipment(context.SteamId).ItemAttributes
                .Where(attribute => attribute.ItemId == targetItemId && attribute.DefIndex == positionAttribute)
                .Select(attribute => attribute.ValueBits)
                .SingleOrDefault();
            var expectedNotification = source.Category switch
            {
                "patch" => 1090U,
                "keychain" => 1091U,
                _ => 1086U
            };
            var completionMessage = response.Messages.SingleOrDefault(message => message.MessageType == 1090);
            var completion = completionMessage == null
                ? null
                : Deserialize<Cs2CustomizationNotification>(completionMessage.PayloadBase64);
            applied &= response.Handled
                && response.Messages.Count == 2
                && targetValue == kitId
                && storedValue == kitId
                && completion?.Request == expectedNotification
                && completion.ItemIds?.Contains(targetItemId) == true;
            positioned &= storedPosition == BitConverter.SingleToUInt32Bits(0.25F);
            plugin.Poll(serverContext);
        }

        var spray = catalog[graffitiIndex];
        var sprayItemId = ItemIdAt(graffitiIndex);
        var sprayKit = spray.Attributes.Single(attribute => attribute.DefIndex == 113).ValueBits;
        var originalRemaining = spray.Attributes.Single(attribute => attribute.DefIndex == 232).ValueBits;
        var decalResponse = plugin.Exchange(context, Request(9185, Serialize(new Cs2PlayerDecalSign
        {
            Itemid = sprayItemId,
            Data = new Cs2PlayerDecalSignature
            {
                Accountid = context.AccountId,
                TraceId = 730,
                Endpos = new[] { 1.0F, 2.0F, 3.0F },
                Startpos = new[] { 4.0F, 5.0F, 6.0F },
                Lefts = new[] { 0.0F, 1.0F, 0.0F },
                Normals = new[] { 0.0F, 0.0F, 1.0F }
            }
        })));
        var signedMessage = decalResponse.Messages.SingleOrDefault(message => message.MessageType == 9185);
        var signed = signedMessage == null
            ? null
            : Deserialize<Cs2PlayerDecalSign>(signedMessage.PayloadBase64);
        var storedRemaining = Cs2GcRuntimeServices.GetEquipment(context.SteamId).ItemAttributes
            .Where(attribute => attribute.ItemId == sprayItemId && attribute.DefIndex == 232)
            .Select(attribute => attribute.ValueBits)
            .SingleOrDefault();
        var serverDecal = plugin.Poll(serverContext).Messages
            .SingleOrDefault(message => message.MessageType == 9185);
        var graffitiOk = decalResponse.Handled
            && decalResponse.Messages.Count == 2
            && signed?.Itemid == sprayItemId
            && signed.Data?.Accountid == context.AccountId
            && signed.Data.TxDefidx == sprayKit
            && signed.Data.TraceId == 730
            && signed.Data.Signature?.Length == 128
            && storedRemaining == originalRemaining - 1
            && serverDecal != null;
        var openResponse = plugin.Exchange(context, Request(2534, Serialize(new Cs2OpenCrate
        {
            SubjectItemId = ItemIdAt(stickerCapsuleIndex)
        })));
        var customizationMessage = openResponse.Messages
            .SingleOrDefault(message => message.MessageType == 1090);
        var customization = customizationMessage == null
            ? null
            : Deserialize<Cs2CustomizationNotification>(customizationMessage.PayloadBase64);
        var addedMessage = openResponse.Messages.SingleOrDefault(message => message.MessageType == 26);
        var addedUpdate = addedMessage == null
            ? null
            : Deserialize<CMsgSOMultipleObjects>(addedMessage.PayloadBase64);
        var reward = addedUpdate?.ObjectsAddeds
            .Where(item => item.TypeId == 1)
            .Select(item => DeserializeBytes<Cs2EconItem>(item.ObjectData))
            .SingleOrDefault();
        var secondOpenResponse = plugin.Exchange(context, Request(2534, Serialize(new Cs2OpenCrate
        {
            SubjectItemId = ItemIdAt(stickerCapsuleIndex)
        })));
        var secondAddedMessage = secondOpenResponse.Messages.SingleOrDefault(message => message.MessageType == 26);
        var secondAdded = secondAddedMessage == null
            ? null
            : Deserialize<CMsgSOMultipleObjects>(secondAddedMessage.PayloadBase64).ObjectsAddeds
                .Where(item => item.TypeId == 1)
                .Select(item => DeserializeBytes<Cs2EconItem>(item.ObjectData))
                .SingleOrDefault();
        var caseOpenResponse = plugin.Exchange(context, Request(2534, Serialize(new Cs2OpenCrate
        {
            SubjectItemId = ItemIdAt(caseIndex)
        })));
        var caseAddedMessage = caseOpenResponse.Messages.SingleOrDefault(message => message.MessageType == 26);
        var caseReward = caseAddedMessage == null
            ? null
            : Deserialize<CMsgSOMultipleObjects>(caseAddedMessage.PayloadBase64).ObjectsAddeds
                .Where(item => item.TypeId == 1)
                .Select(item => DeserializeBytes<Cs2EconItem>(item.ObjectData))
                .SingleOrDefault();
        var caseNotificationMessage = caseOpenResponse.Messages.SingleOrDefault(message => message.MessageType == 1090);
        var caseNotification = caseNotificationMessage == null
            ? null
            : Deserialize<Cs2CustomizationNotification>(caseNotificationMessage.PayloadBase64);
        var caseRewardInstance = caseReward == null
            ? null
            : Cs2GcRuntimeServices.GetEquipment(context.SteamId).Instances
                .SingleOrDefault(instance => instance.ItemId == caseReward.Id);
        var caseRewardTemplate = caseRewardInstance == null
            ? null
            : catalog[caseRewardInstance.TemplateIndex];
        var opened = openResponse.Handled
            && openResponse.Messages.Select(message => message.MessageType).SequenceEqual(new uint[] { 26, 1090 })
            && customization?.Request == 1007
            && customization.ItemIds?.Length == 2
            && customization.ItemIds[0] == reward?.Id
            && customization.ItemIds[1] == ItemIdAt(stickerCapsuleIndex)
            && reward?.DefIndex == catalog[stickerIndex].DefIndex
            && secondOpenResponse.Handled
            && secondAdded?.Id != null
            && secondAdded.Id != reward.Id
            && caseOpenResponse.Handled
            && caseReward?.Id != null
            && caseNotification?.ItemIds?.Length == 2
            && caseNotification.ItemIds[0] == caseReward.Id
            && caseNotification.ItemIds[1] == ItemIdAt(caseIndex)
            && caseRewardTemplate?.Category is "weapon" or "knife" or "glove"
            && Cs2GcRuntimeServices.GetEquipment(context.SteamId).Instances.Count >= 3;
        var ok = applied && positioned && graffitiOk && opened;
        write(
            $"CS2 item customization -> applied={applied}, positioned={positioned}, graffitiEnvelope={graffitiOk}, " +
            $"signature={signed?.Data?.Signature?.Length}, remaining={storedRemaining}, server={serverDecal != null}, " +
            $"opened={opened}, ok={ok}");
        return ok;
    }

    private static bool ExpectHandled(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        uint requestType,
        int expectedCount,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(requestType));
        var ok = response.Handled && response.Messages.Count == expectedCount;
        write($"{requestType} -> handled={response.Handled}, messages={response.Messages.Count}, ok={ok}");
        return ok;
    }

    private static bool ExpectTargetedResponse(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        uint requestType,
        uint expectedResponseType,
        ulong sourceJobId,
        Action<string> write,
        byte[]? body = null)
    {
        var response = plugin.Exchange(context, body == null
            ? Request(requestType, sourceJobId: sourceJobId)
            : Request(requestType, body, sourceJobId: sourceJobId));
        var directReply = response.Messages.SingleOrDefault(message => message.MessageType == expectedResponseType);
        var pushMessagesUntargeted = response.Messages
            .Where(message => message.MessageType != expectedResponseType)
            .All(message => message.TargetJobId == null);
        var ok = response.Handled
            && directReply != null
            && directReply.Protobuf
            && directReply.TargetJobId == sourceJobId
            && pushMessagesUntargeted;
        var actual = response.Messages
            .Select(message => $"{message.MessageType}:{(message.TargetJobId.HasValue ? message.TargetJobId.Value.ToString() : "-")}");
        write(
            $"{requestType} -> handled={response.Handled}, messages=[{string.Join(",", actual)}], expected={expectedResponseType}:{sourceJobId}, ok={ok}");
        return ok;
    }

    private static bool ExpectWelcomeInventoryFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(4006));
        var welcomeMessage = response.Messages.FirstOrDefault(message => message.MessageType == 4004);
        var welcome = welcomeMessage == null ? null : Deserialize<CMsgClientWelcome>(welcomeMessage.PayloadBase64);
        var econCache = welcome?.OutofdateSubscribedCaches.FirstOrDefault(cache => cache.ServiceId == 1);
        var econType = econCache?.Objects.FirstOrDefault(item => item.TypeId == 1);
        var schemaType = econCache?.Objects.FirstOrDefault(item => item.TypeId == 2010);
        var items = econType?.ObjectDatas.Select(DeserializeBytes<CSOEconItem>).ToArray() ?? Array.Empty<CSOEconItem>();
        var equippedItem = items.FirstOrDefault(item => item.DefIndex == 1001);
        var unequippedItem = items.FirstOrDefault(item => item.DefIndex == 1002);
        var globalItem = items.FirstOrDefault(item => item.DefIndex == 1003);
        var expectedEconAccountId = AccountIdFromSteamId(context.SteamId);
        var ok = response.Handled
            && welcome != null
            && econCache != null
            && econCache.OwnerSoid?.Id == context.SteamId
            && schemaType != null
            && schemaType.ObjectDatas.Count == 0
            && items.Length == 3
            && equippedItem != null
            && equippedItem.AccountId == expectedEconAccountId
            && equippedItem.EquippedStates.Count == 1
            && equippedItem.EquippedStates[0].NewClass == 1
            && equippedItem.EquippedStates[0].NewSlot == 3
            && equippedItem.Flags == 0
            && unequippedItem != null
            && unequippedItem.EquippedStates.Count == 0
            && globalItem != null
            && globalItem.EquippedStates.Count == 1
            && globalItem.EquippedStates[0].NewClass == 1000
            && globalItem.EquippedStates[0].NewSlot == 14;
        write(
            $"welcome inventory flow -> handled={response.Handled}, items={items.Length}, " +
            $"equippedDef={equippedItem?.DefIndex}, equippedStates={equippedItem?.EquippedStates.Count}, " +
            $"accountId={equippedItem?.AccountId}, class={equippedItem?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"slot={equippedItem?.EquippedStates.FirstOrDefault()?.NewSlot}, flags={equippedItem?.Flags}, " +
            $"expectedAccountId={expectedEconAccountId}, owner={econCache?.OwnerSoid?.Id}, schemaObjects={schemaType?.ObjectDatas.Count}, " +
            $"expectedOwner={context.SteamId}, unequippedDef={unequippedItem?.DefIndex}, " +
            $"globalDef={globalItem?.DefIndex}, globalClass={globalItem?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"globalSlot={globalItem?.EquippedStates.FirstOrDefault()?.NewSlot}, ok={ok}");
        return ok;
    }

    private static bool ExpectCreateLobbyFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        const ulong sourceJobId = 61;
        var response = plugin.Exchange(context, Request(7038, PracticeLobbyCreateBody(), sourceJobId: sourceJobId));
        var subscribe = response.Messages.Count >= 1 && response.Messages[0].MessageType == 24
            ? Deserialize<CMsgSOCacheSubscribed>(response.Messages[0].PayloadBase64)
            : null;
        var result = response.Messages.Count >= 2 && response.Messages[1].MessageType == 7055
            ? Deserialize<CMsgGenericResult>(response.Messages[1].PayloadBase64)
            : null;
        var subscribedLobbyPayload = subscribe?.Objects.FirstOrDefault(item => item.TypeId == 2004)?.ObjectDatas.FirstOrDefault();
        var staticLobbyPayload = subscribe?.Objects.FirstOrDefault(item => item.TypeId == 2014)?.ObjectDatas.FirstOrDefault();
        var serverLobbyPayload = subscribe?.Objects.FirstOrDefault(item => item.TypeId == 2015)?.ObjectDatas.FirstOrDefault();
        var serverStaticLobbyPayload = subscribe?.Objects.FirstOrDefault(item => item.TypeId == 2016)?.ObjectDatas.FirstOrDefault();
        var subscribedLobby = subscribedLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTALobby>(subscribedLobbyPayload)
            : null;
        var staticLobby = staticLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTAStaticLobby>(staticLobbyPayload)
            : null;
        var serverLobby = serverLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTAServerLobby>(serverLobbyPayload)
            : null;
        var serverStaticLobby = serverStaticLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTAServerStaticLobby>(serverStaticLobbyPayload)
            : null;
        var subscribeTypes = subscribe?.Objects.Select(item => item.TypeId).ToArray() ?? Array.Empty<int>();
        var extraMessage = subscribedLobby?.ExtraMessages.FirstOrDefault();
        var serverStaticMember = serverStaticLobby?.AllMembers.FirstOrDefault();
        var ok = response.Handled
            && response.Messages.Count == 2
            && response.Messages[0].TargetJobId == null
            && response.Messages[1].TargetJobId == sourceJobId
            && subscribe != null
            && subscribeTypes.SequenceEqual([2004, 2013, 2014, 2015, 2016])
            && result?.Eresult == 1
            && subscribedLobby?.AllowSpectating == false
            && subscribedLobby?.LobbyId > 9007199254740991UL
            && subscribedLobby.SeriesType == 0
            && subscribedLobby.TeamDetails.Count == 2
            && extraMessage?.Id == 8821
            && extraMessage.Contents.SequenceEqual(new byte[] { 8, 0 })
            && staticLobby?.AllMembers.Count == 1
            && staticLobby.AllMembers[0].Name == context.PersonaName
            && serverLobby?.AllMembers.Count == 1
            && serverStaticLobby?.AllMembers.Count == 1
            && serverStaticMember?.SteamId == context.SteamId
            && serverStaticMember.IsPlusSubscriber
            && serverStaticMember.FavoriteTeamPacked == 0UL
            && serverStaticMember.BannedHeroIds.SequenceEqual([75, 0, 0, 0]);
        var actual = response.Messages
            .Select(message => $"{message.MessageType}:{(message.TargetJobId.HasValue ? message.TargetJobId.Value.ToString() : "-")}");
        write(
            $"create lobby flow -> handled={response.Handled}, messages=[{string.Join(",", actual)}], " +
            $"subscribeTypes=[{string.Join(",", subscribeTypes)}], " +
            $"lobbyId={subscribedLobby?.LobbyId}, allowSpectating={subscribedLobby?.AllowSpectating}, " +
            $"seriesType={subscribedLobby?.SeriesType}, teamDetails={subscribedLobby?.TeamDetails.Count}, " +
            $"extraMsg={extraMessage?.Id}:{(extraMessage?.Contents is null ? "" : Convert.ToHexString(extraMessage.Contents))}, " +
            $"staticMembers={staticLobby?.AllMembers.Count}, staticName={staticLobby?.AllMembers.FirstOrDefault()?.Name}, " +
            $"serverLobbyMembers={serverLobby?.AllMembers.Count}, serverStaticMembers={serverStaticLobby?.AllMembers.Count}, " +
            $"serverStaticSteamId={serverStaticMember?.SteamId}, plus={serverStaticMember?.IsPlusSubscriber}, " +
            $"result={result?.Eresult}, ok={ok}");
        return ok;
    }

    private static bool ExpectLobbyInviteFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        const ulong inviteeSteamId = 76561197960287931UL;
        queuedMessages.Clear();

        var response = plugin.Exchange(context, Request(4512, Serialize(new CMsgInviteToLobby { SteamId = inviteeSteamId })));
        var reply = response.Messages.FirstOrDefault(message => message.MessageType == 4502);
        var created = reply == null ? null : Deserialize<CMsgInvitationCreated>(reply.PayloadBase64);
        var queued = queuedMessages.FirstOrDefault(message => message.SteamId == inviteeSteamId && message.Message.MessageType == 24);
        var inviteCache = queued.Message == null ? null : Deserialize<CMsgSOCacheSubscribed>(queued.Message.PayloadBase64);
        var inviteType = inviteCache?.Objects.FirstOrDefault(item => item.TypeId == 2013);
        var invitePayload = inviteType?.ObjectDatas.FirstOrDefault();
        var invite = invitePayload is { Length: > 0 } ? DeserializeBytes<CSODOTALobbyInvite>(invitePayload) : null;
        var inviteMember = invite?.Members.FirstOrDefault();

        var ok = response.Handled
            && created?.GroupId > 0
            && created.SteamId == inviteeSteamId
            && !created.UserOffline
            && queued.Message != null
            && inviteCache?.OwnerSoid?.Type == 4
            && inviteCache.OwnerSoid.Id == created.GroupId
            && inviteType != null
            && invite?.GroupId == created.GroupId
            && invite.SenderId == context.SteamId
            && invite.SenderName == context.PersonaName
            && invite.InviteGid > 0
            && inviteMember?.SteamId == context.SteamId
            && inviteMember.Name == context.PersonaName;

        write(
            $"lobby invite flow -> handled={response.Handled}, queued={queued.Message != null}, " +
            $"replyGroup={created?.GroupId}, ownerType={inviteCache?.OwnerSoid?.Type}, ownerId={inviteCache?.OwnerSoid?.Id}, " +
            $"type={inviteType?.TypeId}, sender={invite?.SenderId}, member={inviteMember?.SteamId}:{inviteMember?.Name}, ok={ok}");
        return ok;
    }

    private static bool ExpectGameServerWelcomeFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext serverContext,
        Action<string> write)
    {
        var response = plugin.Exchange(
            serverContext,
            RequestFor(
                serverContext,
                4007,
                Serialize(new CMsgClientHello { Version = 6863 }),
                gameServer: true));
        var welcome = response.Messages.Count == 1 && response.Messages[0].MessageType == 4005
            ? Deserialize<CMsgClientWelcome>(response.Messages[0].PayloadBase64)
            : null;
        var ok = response.Handled
            && response.Messages.Count == 1
            && response.Messages[0].TargetJobId == null
            && response.Messages[0].Protobuf
            && welcome?.Version == 6860
            && welcome.GcSocacheFileVersion == 20;
        write(
            $"game server welcome flow -> handled={response.Handled}, messages={response.Messages.Count}, " +
            $"version={welcome?.Version}, gcSocache={welcome?.GcSocacheFileVersion}, ok={ok}");
        return ok;
    }

    private static bool ExpectChatFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext friendContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        var joinResponse = plugin.Exchange(context, Request(7009));
        var joinOk = joinResponse.Handled
            && joinResponse.Messages.Count == 1
            && joinResponse.Messages[0].MessageType == 7010;
        if (!joinOk)
        {
            write($"chat flow -> join handled={joinResponse.Handled}, messages={joinResponse.Messages.Count}, ok=False");
            return false;
        }

        var join = Deserialize<CMsgDOTAJoinChatChannelResponse>(joinResponse.Messages[0].PayloadBase64);
        var channelId = join.ChannelId;
        joinOk = channelId != 0
            && join.Response == 0
            && join.Members.Count == 1
            && join.Members[0].SteamId == context.SteamId
            && join.Members[0].ChannelUserId == join.ChannelUserId;

        var listResponse = plugin.Exchange(context, Request(7060));
        var listBody = listResponse.Messages.Count == 0
            ? null
            : Deserialize<CMsgDOTARequestChatChannelListResponse>(listResponse.Messages[0].PayloadBase64);
        var listOk = listResponse.Handled
            && listResponse.Messages.Count == 1
            && listResponse.Messages[0].MessageType == 7061
            && listBody?.Channels.Any(channel =>
                channel.ChannelName == join.ChannelName
                && channel.ChannelType == join.ChannelType
                && channel.NumMembers == 1) == true;

        var chatBody = Serialize(new CMsgDOTAChatMessage { ChannelId = channelId, Text = "hello" });
        var chatResponse = plugin.Exchange(context, Request(7273, chatBody));
        var chatOk = chatResponse.Handled
            && chatResponse.Messages.Count == 0;

        var leaveResponse = plugin.Exchange(context, Request(7272, Serialize(new CMsgDOTALeaveChatChannel { ChannelId = channelId })));
        var leftMessage = leaveResponse.Messages.FirstOrDefault(message => message.MessageType == 7014);
        var leftBody = leftMessage == null ? null : Deserialize<CMsgDOTAOtherLeftChatChannel>(leftMessage.PayloadBase64);
        var leaveOk = leaveResponse.Handled
            && leaveResponse.Messages.Count == 1
            && leftBody?.SteamId == context.SteamId
            && leftBody.ChannelUserId == join.ChannelUserId;

        var afterLeaveResponse = plugin.Exchange(context, Request(7273, chatBody));
        var afterLeaveOk = afterLeaveResponse.Handled && afterLeaveResponse.Messages.Count == 0;

        queuedMessages.Clear();
        var privateInvite = plugin.Exchange(
            context,
            Request(8084, Serialize(new CMsgClientToGCPrivateChatInvite
            {
                PrivateChatChannelName = "private_selfcheck",
                InvitedAccountId = friendContext.AccountId
            })));
        var privateInviteReply = privateInvite.Messages.FirstOrDefault(message => message.MessageType == 8091);
        var privateInviteQueued = queuedMessages.FirstOrDefault(message =>
            message.SteamId == friendContext.SteamId && message.Message.MessageType == 8091);
        var privateInviteLocal = privateInviteReply == null
            ? null
            : Deserialize<CMsgGCToClientPrivateChatResponse>(privateInviteReply.PayloadBase64);
        var privateInviteRemote = privateInviteQueued.Message == null
            ? null
            : Deserialize<CMsgGCToClientPrivateChatResponse>(privateInviteQueued.Message.PayloadBase64);
        var privateInviteOk = privateInvite.Handled
            && privateInviteLocal?.result == CMsgGCToClientPrivateChatResponse.Result.Success
            && privateInviteLocal.PrivateChatChannelName == "private_selfcheck"
            && privateInviteLocal.Username == friendContext.PersonaName
            && privateInviteRemote?.result == CMsgGCToClientPrivateChatResponse.Result.Success
            && privateInviteRemote.PrivateChatChannelName == "private_selfcheck"
            && privateInviteRemote.Username == context.PersonaName;

        var privateJoin = plugin.Exchange(
            friendContext,
            RequestFor(
                friendContext,
                7009,
                Serialize(new CMsgDOTAJoinChatChannel
                {
                    ChannelName = "private_selfcheck",
                    ChannelType = DOTAChatChannelTypet.DOTAChannelTypeWhisper
                })));
        var privateJoinResponse = privateJoin.Messages.FirstOrDefault(message => message.MessageType == 7010);
        var privateJoinBody = privateJoinResponse == null
            ? null
            : Deserialize<CMsgDOTAJoinChatChannelResponse>(privateJoinResponse.PayloadBase64);
        queuedMessages.Clear();
        var privateMessage = plugin.Exchange(
            friendContext,
            RequestFor(
                friendContext,
                7273,
                Serialize(new CMsgDOTAChatMessage { ChannelId = privateJoinBody?.ChannelId ?? 0UL, Text = "privado" })));
        var deliveredPrivate = queuedMessages.FirstOrDefault(message =>
            message.SteamId == context.SteamId && message.Message.MessageType == 7273);
        var deliveredPrivateBody = deliveredPrivate.Message == null
            ? null
            : Deserialize<CMsgDOTAChatMessage>(deliveredPrivate.Message.PayloadBase64);
        var privateMessageOk = privateJoinBody?.ChannelId > 0
            && privateMessage.Handled
            && privateMessage.Messages.Count == 0
            && deliveredPrivateBody?.Text == "privado"
            && deliveredPrivateBody.PersonaName == friendContext.PersonaName
            && deliveredPrivateBody.AccountId == friendContext.AccountId;

        var ok = joinOk && listOk && chatOk && leaveOk && afterLeaveOk && privateInviteOk && privateMessageOk;
        write(
            $"chat flow -> join={joinOk}, list={listOk}, noSelfEcho={chatOk}, leave={leaveOk}, afterLeave={afterLeaveOk}, " +
            $"privateInvite={privateInviteOk}, privateMessage={privateMessageOk}, ok={ok}");
        return ok;
    }

    private static bool ExpectLobbyDiscoveryFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext friendContext,
        Action<string> write)
    {
        var response = plugin.Exchange(
            friendContext,
            RequestFor(
                friendContext,
                7042,
                Serialize(new CMsgPracticeLobbyList
                {
                    Region = 0,
                    GameMode = DOTAGameMode.DotaGamemodeNone
                })));
        var listMessage = response.Messages.FirstOrDefault(message => message.MessageType == 7043);
        var list = listMessage == null ? null : Deserialize<CMsgPracticeLobbyListResponse>(listMessage.PayloadBase64);
        var lobby = list?.Lobbies.FirstOrDefault();
        var ok = response.Handled
            && listMessage != null
            && list?.Lobbies.Count > 0
            && lobby?.Name == "Sala 1"
            && lobby.LeaderAccountId == 15892202
            && lobby.Id > 9007199254740991UL
            && lobby.Players == 1
            && lobby.ServerRegion == 0
            && !lobby.RequiresPassKey;
        write(
            $"lobby discovery flow -> handled={response.Handled}, lobbies={list?.Lobbies.Count}, " +
            $"leader={lobby?.LeaderAccountId}, name={lobby?.Name}, ok={ok}");
        return ok;
    }

    private static bool ExpectLobbyJoinFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext leaderContext,
        GameCoordinatorContext friendContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        var listResponse = plugin.Exchange(
            friendContext,
            RequestFor(
                friendContext,
                7042,
                Serialize(new CMsgPracticeLobbyList
                {
                    Region = 0,
                    GameMode = DOTAGameMode.DotaGamemodeNone
                })));
        var listMessage = listResponse.Messages.FirstOrDefault(message => message.MessageType == 7043);
        var list = listMessage == null ? null : Deserialize<CMsgPracticeLobbyListResponse>(listMessage.PayloadBase64);
        var entry = list?.Lobbies.FirstOrDefault(lobby => lobby.LeaderAccountId == leaderContext.AccountId);
        queuedMessages.Clear();

        var response = plugin.Exchange(
            friendContext,
            RequestFor(
                friendContext,
                7044,
                Serialize(new CMsgPracticeLobbyJoin
                {
                    LobbyId = entry?.Id ?? 0UL,
                    ClientVersion = 6856,
                    PassKey = string.Empty
                })));
        var subscribedMessage = response.Messages.FirstOrDefault(message => message.MessageType == 24);
        var createdMessage = response.Messages.FirstOrDefault(message => message.MessageType == 21);
        var joinResponseMessage = response.Messages.FirstOrDefault(message => message.MessageType == 7113);
        var subscribed = subscribedMessage == null ? null : Deserialize<CMsgSOCacheSubscribed>(subscribedMessage.PayloadBase64);
        var created = createdMessage == null ? null : Deserialize<CMsgSOSingleObject>(createdMessage.PayloadBase64);
        var joinResponse = joinResponseMessage == null ? null : Deserialize<CMsgPracticeLobbyJoinResponse>(joinResponseMessage.PayloadBase64);
        var subscribeTypes = subscribed?.Objects.Select(item => item.TypeId).ToArray() ?? Array.Empty<int>();
        var lobbyPayload = subscribed?.Objects.FirstOrDefault(item => item.TypeId == 2004)?.ObjectDatas.FirstOrDefault();
        var staticLobbyPayload = subscribed?.Objects.FirstOrDefault(item => item.TypeId == 2014)?.ObjectDatas.FirstOrDefault();
        var serverLobbyPayload = subscribed?.Objects.FirstOrDefault(item => item.TypeId == 2015)?.ObjectDatas.FirstOrDefault();
        var serverStaticLobbyPayload = subscribed?.Objects.FirstOrDefault(item => item.TypeId == 2016)?.ObjectDatas.FirstOrDefault();
        var lobby = lobbyPayload is { Length: > 0 } ? DeserializeBytes<CSODOTALobby>(lobbyPayload) : null;
        var staticLobby = staticLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTAStaticLobby>(staticLobbyPayload)
            : null;
        var serverLobby = serverLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTAServerLobby>(serverLobbyPayload)
            : null;
        var serverStaticLobby = serverStaticLobbyPayload is { Length: > 0 }
            ? DeserializeBytes<CSODOTAServerStaticLobby>(serverStaticLobbyPayload)
            : null;
        var leaderUpdateMessage = queuedMessages.FirstOrDefault(message => message.SteamId == leaderContext.SteamId && message.Message.MessageType == 26);
        var leaderUpdate = leaderUpdateMessage.Message == null ? null : Deserialize<CMsgSOMultipleObjects>(leaderUpdateMessage.Message.PayloadBase64);
        var leaderUpdateTypes = leaderUpdate?.ObjectsModifieds.Select(item => item.TypeId).ToArray() ?? Array.Empty<int>();
        var ok = listResponse.Handled
            && entry != null
            && response.Handled
            && response.Messages.Count == 3
            && response.Messages[0].MessageType == 24
            && response.Messages[1].MessageType == 21
            && response.Messages[2].MessageType == 7113
            && subscribed?.OwnerSoid?.Type == 3
            && subscribed.OwnerSoid.Id == entry.Id
            && subscribeTypes.SequenceEqual([2004, 2013, 2014, 2015, 2016])
            && created?.TypeId == 2004
            && created.OwnerSoid?.Id == entry.Id
            && joinResponse?.Result == DOTAJoinLobbyResult.DotaJoinResultSuccess
            && leaderUpdateTypes.SequenceEqual([2004, 2014, 2015, 2016])
            && lobby?.AllMembers.Count == 2
            && lobby.MemberIndices.SequenceEqual([0u, 1u])
            && lobby.AllMembers.Any(member => member.Id == leaderContext.SteamId)
            && lobby.AllMembers.Any(member => member.Id == friendContext.SteamId
                && member.LeaverStatus == DOTALeaverStatust.DotaLeaverNone)
            && staticLobby?.AllMembers.Count == 2
            && staticLobby.AllMembers.Any(member => member.Name == friendContext.PersonaName)
            && serverLobby?.AllMembers.Count == 2
            && serverStaticLobby?.AllMembers.Count == 2
            && serverStaticLobby.AllMembers.Any(member => member.SteamId == friendContext.SteamId)
            && leaderUpdateMessage.Message != null;
        write(
            $"lobby join flow -> handled={response.Handled}, messages={response.Messages.Count}, " +
            $"subscribeTypes=[{string.Join(",", subscribeTypes)}], createType={created?.TypeId}, " +
            $"leaderUpdateTypes=[{string.Join(",", leaderUpdateTypes)}], " +
            $"members={lobby?.AllMembers.Count}/{staticLobby?.AllMembers.Count}/{serverLobby?.AllMembers.Count}/" +
            $"{serverStaticLobby?.AllMembers.Count}, leaderUpdate={leaderUpdateMessage.Message != null}, " +
            $"result={joinResponse?.Result}, ok={ok}");
        return ok;
    }

    private static bool ExpectLobbyTeamSlotFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext leaderContext,
        GameCoordinatorContext friendContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        const ulong firstJobId = 63;
        const ulong duplicateJobId = 64;
        var request = new CMsgPracticeLobbySetTeamSlot
        {
            Team = DotaGcTeam.DotaGcTeamGoodGuys,
            Slot = 2
        };

        queuedMessages.Clear();
        var first = plugin.Exchange(
            friendContext,
            RequestFor(friendContext, 7047, Serialize(request), sourceJobId: firstJobId));
        var firstResult = first.Messages.FirstOrDefault(message => message.MessageType == 7055) is { } firstResultMessage
            ? Deserialize<CMsgGenericResult>(firstResultMessage.PayloadBase64)
            : null;
        var firstLobby = LastDirectLobby(first.Messages);
        var firstMember = firstLobby?.AllMembers.FirstOrDefault(member => member.Id == friendContext.SteamId);
        var leaderUpdates = queuedMessages.Count(message =>
            message.SteamId == leaderContext.SteamId && message.Message.MessageType == 26);

        queuedMessages.Clear();
        var duplicate = plugin.Exchange(
            friendContext,
            RequestFor(friendContext, 7047, Serialize(request), sourceJobId: duplicateJobId));
        var duplicateResult = duplicate.Messages.Count == 1 && duplicate.Messages[0].MessageType == 7055
            ? Deserialize<CMsgGenericResult>(duplicate.Messages[0].PayloadBase64)
            : null;
        var duplicateUpdates = queuedMessages.Count(message => message.Message.MessageType == 26);

        var ok = first.Handled
            && first.Messages.Count == 2
            && first.Messages[0].MessageType == 7055
            && first.Messages[0].TargetJobId == firstJobId
            && first.Messages[1].MessageType == 26
            && first.Messages[1].TargetJobId == null
            && firstResult?.Eresult == 1
            && firstMember?.Team == DotaGcTeam.DotaGcTeamGoodGuys
            && firstMember.Slot == 2
            && firstMember.LeaverStatus == DOTALeaverStatust.DotaLeaverNone
            && leaderUpdates == 1
            && duplicate.Handled
            && duplicate.Messages.Count == 1
            && duplicate.Messages[0].TargetJobId == duplicateJobId
            && duplicateResult?.Eresult == 1
            && duplicateUpdates == 0;
        write(
            $"lobby team slot flow -> first=[{string.Join(',', first.Messages.Select(message => message.MessageType))}], " +
            $"team={firstMember?.Team}, slot={firstMember?.Slot}, leaver={firstMember?.LeaverStatus}, " +
            $"leaderUpdates={leaderUpdates}, duplicate=[{string.Join(',', duplicate.Messages.Select(message => message.MessageType))}], " +
            $"duplicateUpdates={duplicateUpdates}, ok={ok}");
        return ok;
    }

    private static bool ExpectApplyTeamFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext friendContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(7142, Serialize(new CMsgApplyTeamToPracticeLobby { TeamId = 7733573 })));
        var result = response.Messages.FirstOrDefault(message => message.MessageType == 2579) is { } resultMessage
            ? Deserialize<CMsgGenericResult>(resultMessage.PayloadBase64)
            : null;
        var updateMessage = response.Messages.FirstOrDefault(message => message.MessageType == 26);
        var update = updateMessage == null ? null : Deserialize<CMsgSOMultipleObjects>(updateMessage.PayloadBase64);
        var ok = response.Handled
            && response.Messages.Count == 2
            && response.Messages[0].MessageType == 26
            && response.Messages[1].MessageType == 2579
            && update?.ObjectsModifieds.Count == 1
            && update.ObjectsModifieds[0].TypeId == 2004
            && result?.Eresult == 1;
        write(
            $"apply team flow -> handled={response.Handled}, messages={response.Messages.Count}, queued={queuedMessages.Count}, " +
            $"updateType={update?.ObjectsModifieds.FirstOrDefault()?.TypeId}, result={result?.Eresult}, ok={ok}");
        return ok;
    }

    private static bool ExpectLaunchFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext friendContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        const ulong sourceJobId = 62;
        var response = plugin.Exchange(
            context,
            Request(7041, Serialize(new CMsgPracticeLobbyLaunch { ClientVersion = 6856 }), sourceJobId: sourceJobId));
        var resultMessage = response.Messages.FirstOrDefault(message => message.MessageType == 2579);
        var result = resultMessage == null
            ? null
            : Deserialize<CMsgGenericResult>(resultMessage.PayloadBase64);
        var updateMessage = response.Messages.FirstOrDefault(message => message.MessageType == 26);
        var update = updateMessage == null ? null : Deserialize<CMsgSOMultipleObjects>(updateMessage.PayloadBase64);
        var ok = response.Handled
            && response.Messages.Count == 2
            && response.Messages[0].MessageType == 26
            && response.Messages[1].MessageType == 2579
            && update?.ObjectsModifieds.Count == 1
            && update.ObjectsModifieds[0].TypeId == 2004
            && result?.Eresult == 1
            && resultMessage?.TargetJobId == sourceJobId;
        write(
            $"launch flow -> handled={response.Handled}, messages={response.Messages.Count}, queued={queuedMessages.Count}, " +
            $"updateType={update?.ObjectsModifieds.FirstOrDefault()?.TypeId}, result={result?.Eresult}, ok={ok}");
        return ok;
    }

    private static bool ExpectDedicatedAttachFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext clientContext,
        GameCoordinatorContext friendContext,
        GameCoordinatorContext serverContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        queuedMessages.Clear();

        var info = new CMsgGameServerInfo
        {
            ServerPublicIpAddr = IpToUInt32(97, 120, 234, 36),
            ServerPrivateIpAddr = IpToUInt32(192, 168, 212, 252),
            ServerPort = 27015,
            ServerTvPort = 37025
        };
        var infoResponse = plugin.Exchange(serverContext, RequestFor(serverContext, 4508, Serialize(info), gameServer: true));
        var availableResponse = plugin.Exchange(serverContext, RequestFor(serverContext, 4506, gameServer: true));
        var lobby = LastDirectLobby(infoResponse.Messages.Concat(availableResponse.Messages))
            ?? LastQueuedClientLobby(queuedMessages);
        var realtimeStatsMessage = availableResponse.Messages.FirstOrDefault(message => message.MessageType == 8042);
        var realtimeStats = realtimeStatsMessage == null
            ? null
            : Deserialize<CMsgGCToServerRealtimeStatsStartStop>(realtimeStatsMessage.PayloadBase64);
        var serverItems = ServerEconItems(infoResponse.Messages, queuedMessages, serverContext.SteamId);
        var serverOwnerCaches = ServerOwnerGameCaches(infoResponse.Messages, queuedMessages, serverContext.SteamId);
        var serverHeroItem = serverItems.FirstOrDefault(item => item.DefIndex == 1001);
        var serverGlobalItem = serverItems.FirstOrDefault(item => item.DefIndex == 1003);
        var radiant = lobby?.TeamDetails.Count > 0 ? lobby.TeamDetails[0] : null;
        var ok = infoResponse.Handled
            && availableResponse.Handled
            && realtimeStats?.Delayed == true
            && serverOwnerCaches.Length == 2
            && serverOwnerCaches.All(cache => cache.ServiceId == 0
                && (cache.ServiceLists?.Contains(1u) ?? false))
            && serverOwnerCaches.Any(cache => cache.OwnerSoid?.Id == clientContext.SteamId)
            && serverOwnerCaches.Any(cache => cache.OwnerSoid?.Id == friendContext.SteamId)
            && serverItems.Length == 4
            && serverHeroItem != null
            && serverHeroItem.EquippedStates.Count == 1
            && serverHeroItem.EquippedStates[0].NewClass == 1
            && serverHeroItem.EquippedStates[0].NewSlot == 3
            && serverGlobalItem != null
            && serverGlobalItem.EquippedStates.Count == 1
            && serverGlobalItem.EquippedStates[0].NewClass == 1000
            && serverGlobalItem.EquippedStates[0].NewSlot == 14
            && lobby != null
            && lobby.state == CSODOTALobby.State.Run
            && lobby.ServerId == serverContext.SteamId
            && lobby.Connect == "97.120.234.36:27015 192.168.212.252:27015"
            && lobby.GameStartTime > 0
            && radiant?.TeamId == 7733573
            && !radiant.TeamComplete;
        write(
            $"dedicated attach flow -> infoHandled={infoResponse.Handled}, availableHandled={availableResponse.Handled}, " +
            $"queued={queuedMessages.Count}, state={lobby?.state}, connect={lobby?.Connect}, " +
            $"serverOwnerCaches={serverOwnerCaches.Length}, serverItems={serverItems.Length}, " +
            $"heroClass={serverHeroItem?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"heroSlot={serverHeroItem?.EquippedStates.FirstOrDefault()?.NewSlot}, " +
            $"globalClass={serverGlobalItem?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"globalSlot={serverGlobalItem?.EquippedStates.FirstOrDefault()?.NewSlot}, " +
            $"realtimeDelayed={realtimeStats?.Delayed}, ok={ok}");
        return ok;
    }

    private static bool ExpectRealtimePregameStats(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext serverContext,
        Action<string> write)
    {
        const int pregameTime = -48;
        var stats = new CMsgServerToGCRealtimeStats
        {
            Delayed = new CMsgDOTARealtimeGameStatsTerse
            {
                Match = new CMsgDOTARealtimeGameStatsTerse.MatchDetails
                {
                    ServerSteamId = serverContext.SteamId,
                    MatchId = 90000000000043UL,
                    Timestamp = (uint)DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    GameTime = pregameTime,
                    GameState = 4,
                    GameMode = 1,
                    LobbyType = 1
                }
            }
        };
        var response = plugin.Exchange(
            serverContext,
            RequestFor(serverContext, 8041, Serialize(stats), gameServer: true));
        var ok = response.Handled && response.Messages.Count == 0;
        write(
            $"realtime pregame stats -> handled={response.Handled}, gameTime={pregameTime}, " +
            $"messages={response.Messages.Count}, ok={ok}");
        return ok;
    }

    private static bool ExpectDestroyedLobbyInviteReconnectFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        GameCoordinatorContext friendContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        queuedMessages.Clear();
        var inviteResponse = plugin.Exchange(
            context,
            Request(4512, Serialize(new CMsgInviteToLobby { SteamId = friendContext.SteamId })));
        queuedMessages.Clear();

        var destroyResponse = plugin.Exchange(
            context,
            Request(8246, Serialize(new CMsgDOTADestroyLobbyRequest())));
        var queuedInviteUnsubscribe = queuedMessages
            .Where(message => message.SteamId == friendContext.SteamId && message.Message.MessageType == 25)
            .Select(message => Deserialize<CMsgSOCacheUnsubscribed>(message.Message.PayloadBase64))
            .FirstOrDefault(message => message.OwnerSoid?.Type == 4);
        var reconnectResponse = plugin.Exchange(friendContext, RequestFor(friendContext, 4006));
        var reconnectTypes = reconnectResponse.Messages.Select(message => message.MessageType).ToArray();
        var ok = inviteResponse.Handled
            && destroyResponse.Handled
            && queuedInviteUnsubscribe?.OwnerSoid?.Type == 4
            && reconnectResponse.Handled
            && reconnectTypes.SequenceEqual(new uint[] { 4009, 4004, 4009 });
        write(
            $"destroyed lobby invite reconnect -> invited={inviteResponse.Handled}, destroyed={destroyResponse.Handled}, " +
            $"inviteUnsubscribe={queuedInviteUnsubscribe?.OwnerSoid?.Type}, " +
            $"reconnect=[{string.Join(',', reconnectTypes)}], ok={ok}");
        return ok;
    }

    private static bool ExpectEquipVisibleCatalogItemFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        ulong serverSteamId,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        const ulong sourceJobId = 63;
        queuedMessages.Clear();

        var equip = new CMsgClientToGCEquipItems();
        equip.Equips.Add(new CMsgAdjustItemEquippedState
        {
            ItemId = BuildDotaItemInstanceId(context.SteamId, 1002),
            NewClass = 1,
            NewSlot = 4,
            StyleIndex = 0
        });

        var response = plugin.Exchange(context, Request(2569, Serialize(equip), sourceJobId: sourceJobId));
        var updateMessage = response.Messages.FirstOrDefault(message => message.MessageType == 26);
        var replyMessage = response.Messages.FirstOrDefault(message => message.MessageType == 2570);
        var update = updateMessage == null
            ? null
            : Deserialize<CMsgSOMultipleObjects>(updateMessage.PayloadBase64);
        var updatedItem = update?.ObjectsModifieds
            .Where(item => item.TypeId == 1)
            .Select(item => DeserializeBytes<CSOEconItem>(item.ObjectData))
            .FirstOrDefault(item => item.DefIndex == 1002);
        var reply = replyMessage == null
            ? null
            : Deserialize<CMsgClientToGCEquipItemsResponse>(replyMessage.PayloadBase64);
        var serverItem = ServerSingleEconItems(queuedMessages, serverSteamId)
            .FirstOrDefault(item => item.DefIndex == 1002);
        var expectedAccountId = AccountIdFromSteamId(context.SteamId);
        var ok = response.Handled
            && updateMessage?.TargetJobId == null
            && replyMessage?.TargetJobId == sourceJobId
            && update?.OwnerSoid?.Id == context.SteamId
            && update.ServiceId == 1
            && updatedItem != null
            && updatedItem.AccountId == expectedAccountId
            && updatedItem.EquippedStates.Count == 1
            && updatedItem.EquippedStates[0].NewClass == 1
            && updatedItem.EquippedStates[0].NewSlot == 4
            && serverItem != null
            && serverItem.EquippedStates.Count == 1
            && serverItem.EquippedStates[0].NewClass == 1
            && serverItem.EquippedStates[0].NewSlot == 4
            && reply?.SoCacheVersionId > 4242;

        write(
            $"equip visible catalog item flow -> handled={response.Handled}, " +
            $"clientDef={updatedItem?.DefIndex}, clientClass={updatedItem?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"clientSlot={updatedItem?.EquippedStates.FirstOrDefault()?.NewSlot}, accountId={updatedItem?.AccountId}, " +
            $"serverDef={serverItem?.DefIndex}, serverClass={serverItem?.EquippedStates.FirstOrDefault()?.NewClass}, " +
            $"serverSlot={serverItem?.EquippedStates.FirstOrDefault()?.NewSlot}, version={reply?.SoCacheVersionId}, ok={ok}");
        return ok;
    }

    private static bool ExpectProfileCardAndUpdateFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        Action<string> write)
    {
        var backgroundItemId = BuildDotaItemInstanceId(context.SteamId, 1003);
        var update = new CMsgProfileUpdate
        {
            BackgroundItemId = backgroundItemId,
            FeaturedHeroIds = new[] { 1 }
        };
        var updateResponse = plugin.Exchange(context, Request(8270, Serialize(update), sourceJobId: 8270));
        var updateReply = updateResponse.Messages.FirstOrDefault(message => message.MessageType == 8271);
        var updateBody = updateReply == null
            ? null
            : Deserialize<CMsgProfileUpdateResponse>(updateReply.PayloadBase64);

        var profileResponse = plugin.Exchange(
            context,
            Request(8268, Serialize(new CMsgProfileRequest { AccountId = context.AccountId }), sourceJobId: 8268));
        var profileReply = profileResponse.Messages.FirstOrDefault(message => message.MessageType == 8269);
        var profile = profileReply == null
            ? null
            : Deserialize<CMsgProfileResponse>(profileReply.PayloadBase64);

        var cardResponse = plugin.Exchange(
            context,
            Request(7534, Serialize(new CMsgClientToGCGetProfileCard { AccountId = context.AccountId }), sourceJobId: 7534));
        var cardReply = cardResponse.Messages.FirstOrDefault(message => message.MessageType == 7535);
        var card = cardReply == null
            ? null
            : Deserialize<CMsgDOTAProfileCard>(cardReply.PayloadBase64);

        var featuredHero = profile?.FeaturedHeroes.FirstOrDefault(hero => hero.HeroId == 1);
        var featuredItem = featuredHero?.EquippedEconItems.FirstOrDefault(item => item.DefIndex == 1001);
        var ok = updateResponse.Handled
            && updateReply?.TargetJobId == 8270
            && updateBody?.result == CMsgProfileUpdateResponse.Result.Success
            && profileResponse.Handled
            && profileReply?.TargetJobId == 8268
            && profile?.Result == CMsgProfileResponse.EResponse.keSuccess
            && profile.BackgroundItem?.DefIndex == 1003
            && featuredHero?.ManuallySet == true
            && featuredItem != null
            && featuredItem.EquippedStates.Count == 1
            && featuredItem.EquippedStates[0].NewClass == 1
            && cardResponse.Handled
            && cardReply?.TargetJobId == 7534
            && card?.AccountId == context.AccountId
            && card.BadgePoints == 110;

        write(
            $"profile legacy flow -> update={updateResponse.Handled}, backgroundDef={profile?.BackgroundItem?.DefIndex}, " +
            $"featuredHero={featuredHero?.HeroId}, featuredItem={featuredItem?.DefIndex}, " +
            $"badgePoints={card?.BadgePoints}, ok={ok}");
        return ok;
    }

    private static bool ExpectConnectedPlayersFlow(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext clientContext,
        GameCoordinatorContext serverContext,
        List<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        Action<string> write)
    {
        queuedMessages.Clear();

        var players = new CMsgConnectedPlayers
        {
            GameState = DOTAGameState.DotaGamerulesStateHeroSelection,
            send_reason = CMsgConnectedPlayers.SendReason.GameState
        };
        players.ConnectedPlayers.Add(new CMsgConnectedPlayers.Player
        {
            SteamId = clientContext.SteamId,
            HeroId = 0
        });

        var response = plugin.Exchange(serverContext, RequestFor(serverContext, 7034, Serialize(players), gameServer: true));
        var lobby = LastDirectLobby(response.Messages) ?? LastQueuedClientLobby(queuedMessages);
        var member = lobby?.AllMembers.FirstOrDefault(player => player.Id == clientContext.SteamId);
        var ok = response.Handled
            && lobby != null
            && lobby.state == CSODOTALobby.State.Run
            && lobby.GameState == DOTAGameState.DotaGamerulesStateHeroSelection
            && member != null
            && member.LeaverStatus == DOTALeaverStatust.DotaLeaverNone;
        write(
            $"connected players flow -> handled={response.Handled}, queued={queuedMessages.Count}, " +
            $"state={lobby?.state}, gameState={lobby?.GameState}, leaver={member?.LeaverStatus}, ok={ok}");
        return ok;
    }

    private static bool ExpectUnhandled(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        uint requestType,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(requestType));
        var ok = !response.Handled && response.Messages.Count == 0;
        write($"{requestType} -> handled={response.Handled}, messages={response.Messages.Count}, ok={ok}");
        return ok;
    }

    private static bool ExpectSocialMatchDetails(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        ulong matchId,
        Action<string> write)
    {
        var response = plugin.Exchange(context, Request(7095, Serialize(new CMsgGCMatchDetailsRequest { MatchId = matchId })));
        var details = response.Messages.Count == 1 && response.Messages[0].MessageType == 7096
            ? Deserialize<CMsgGCMatchDetailsResponse>(response.Messages[0].PayloadBase64)
            : null;
        var ok = response.Handled
            && details != null
            && details.Result == 1
            && details.Match != null
            && details.Match.MatchId == matchId
            && details.Match.Players.Count == 1
            && details.Match.Players[0].AccountId == context.AccountId;
        write(
            $"social match details -> handled={response.Handled}, result={details?.Result}, " +
            $"match={details?.Match?.MatchId}, players={details?.Match?.Players.Count}, " +
            $"account={details?.Match?.Players.FirstOrDefault()?.AccountId}, ok={ok}");
        return ok;
    }

    private static bool ExpectSocialMatchPostComment(
        GameCoordinatorScriptPlugin plugin,
        GameCoordinatorContext context,
        ulong matchId,
        Action<string> write)
    {
        var request = new CMsgClientToGCSocialFeedPostCommentRequest
        {
            EventId = matchId,
            Comment = "self-check social match comment"
        };
        var response = plugin.Exchange(context, Request(8016, Serialize(request)));
        var result = response.Messages.Count == 1 && response.Messages[0].MessageType == 8017
            ? Deserialize<CMsgGCToClientSocialFeedPostCommentResponse>(response.Messages[0].PayloadBase64)
            : null;
        var comments = DotaGcRuntimeServices.StatsStore?.GetSocialMatchComments(matchId) ?? Array.Empty<DotaStatsComment>();
        var ok = response.Handled
            && result != null
            && result.Success
            && comments.Any(comment =>
                comment.AccountId == context.AccountId &&
                comment.Comment == "self-check social match comment");
        write($"social match post comment -> handled={response.Handled}, persisted={comments.Count}, ok={ok}");
        return ok;
    }

    private static void SeedSocialMatchData(DotaStatsStore store, GameCoordinatorContext context)
    {
        var match = new DotaStatsMatch
        {
            MatchId = 90000000000042UL,
            OwnerSteamId = context.SteamId,
            ServerSteamId = 85568392920047069UL,
            StartTime = (uint)DateTimeOffset.UtcNow.AddMinutes(-40).ToUnixTimeSeconds(),
            Duration = 1800,
            GameMode = 22,
            LobbyType = 7,
            GoodGuysWin = true,
            MatchFlags = 0,
            RadiantScore = 42,
            DireScore = 31,
            Cluster = 227,
            FirstBloodTime = 82
        };
        match.Players.Add(new DotaStatsMatchPlayer
        {
            MatchId = match.MatchId,
            AccountId = context.AccountId,
            SteamId = context.SteamId,
            PersonaName = context.PersonaName,
            Team = 0,
            PlayerSlot = 0,
            HeroId = 1,
            Kills = 10,
            Deaths = 2,
            Assists = 14,
            Winner = true,
            GoodGuys = true,
            Gold = 1200,
            GoldSpent = 17500,
            Gpm = 560,
            Xpm = 720,
            LastHits = 210,
            Denies = 12,
            HeroDamage = 26000,
            TowerDamage = 4200,
            HeroHealing = 0,
            Level = 24,
            NetWorth = 21000,
            Items = new List<uint> { 50, 63, 116, 147, 160, 168 },
            StartTime = match.StartTime,
            Duration = match.Duration,
            GameMode = match.GameMode,
            LobbyType = match.LobbyType,
            GoodGuysWin = match.GoodGuysWin,
            MatchFlags = match.MatchFlags,
            RadiantScore = match.RadiantScore,
            DireScore = match.DireScore,
            Cluster = match.Cluster,
            FirstBloodTime = match.FirstBloodTime
        });
        store.RecordMatch(match);
    }

    private static byte[] PracticeLobbyCreateBody()
    {
        return Serialize(new CMsgPracticeLobbyCreate
        {
            ClientVersion = 6856,
            PassKey = string.Empty,
            LobbyDetails = new CMsgPracticeLobbySetDetails
            {
                LobbyId = 0,
                GameName = "Sala 1",
                ServerRegion = 0,
                GameMode = 1,
                CmPick = DotaCmPick.DotaCmRandom,
                BotDifficultyRadiant = DOTABotDifficulty.BotDifficultyHard,
                BotDifficultyDire = DOTABotDifficulty.BotDifficultyHard,
                AllowSpectating = true,
                PassKey = string.Empty,
                Leagueid = 0,
                PenaltyLevelRadiant = 0,
                PenaltyLevelDire = 0,
                SeriesType = 0,
                RadiantSeriesWins = 0,
                DireSeriesWins = 0,
                Allchat = false,
                DotaTvDelay = LobbyDotaTVDelay.LobbyDotaTV10,
                Lan = true,
                Visibility = DOTALobbyVisibility.DOTALobbyVisibilityPublic,
                PauseSetting = LobbyDotaPauseSetting.LobbyDotaPauseSettingUnlimited
            }
        });
    }

    private static ApiGCExchangeRequest Request(uint messageType, ulong? sourceJobId = null)
    {
        return new ApiGCExchangeRequest
        {
            AppId = DotaAppId,
            MessageType = messageType,
            BodyBase64 = string.Empty,
            SteamId = TestSteamId,
            GameServer = false,
            SourceJobId = sourceJobId
        };
    }

    private static ApiGCExchangeRequest Request(uint messageType, byte[] body, ulong? sourceJobId = null)
    {
        var request = Request(messageType, sourceJobId);
        request.BodyBase64 = Convert.ToBase64String(body);
        return request;
    }

    private static ApiGCExchangeRequest RequestFor(
        GameCoordinatorContext context,
        uint messageType,
        bool gameServer = false,
        ulong? sourceJobId = null)
    {
        return new ApiGCExchangeRequest
        {
            AppId = context.AppId,
            MessageType = messageType,
            BodyBase64 = string.Empty,
            SteamId = context.SteamId,
            GameServer = gameServer,
            SourceJobId = sourceJobId
        };
    }

    private static ApiGCExchangeRequest RequestFor(
        GameCoordinatorContext context,
        uint messageType,
        byte[] body,
        bool gameServer = false,
        ulong? sourceJobId = null)
    {
        var request = RequestFor(context, messageType, gameServer, sourceJobId);
        request.BodyBase64 = Convert.ToBase64String(body);
        return request;
    }

    private static CSODOTALobby? LastQueuedClientLobby(List<(ulong SteamId, ApiGCMessage Message)> queuedMessages)
    {
        for (var i = queuedMessages.Count - 1; i >= 0; i--)
        {
            var message = queuedMessages[i].Message;
            if (message.MessageType != 26)
            {
                continue;
            }

            var update = Deserialize<CMsgSOMultipleObjects>(message.PayloadBase64);
            var lobbyPayload = update.ObjectsModifieds.FirstOrDefault(item => item.TypeId == 2004)?.ObjectData;
            if (lobbyPayload is { Length: > 0 })
            {
                return DeserializeBytes<CSODOTALobby>(lobbyPayload);
            }
        }

        return null;
    }

    private static CSODOTALobby? LastDirectLobby(IEnumerable<ApiGCMessage> messages)
    {
        foreach (var message in messages.Reverse())
        {
            if (message.MessageType == 26)
            {
                var update = Deserialize<CMsgSOMultipleObjects>(message.PayloadBase64);
                var lobbyPayload = update.ObjectsModifieds.FirstOrDefault(item => item.TypeId == 2004)?.ObjectData;
                if (lobbyPayload is { Length: > 0 })
                {
                    return DeserializeBytes<CSODOTALobby>(lobbyPayload);
                }
            }

            if (message.MessageType == 24)
            {
                var subscribed = Deserialize<CMsgSOCacheSubscribed>(message.PayloadBase64);
                var lobbyPayload = subscribed.Objects.FirstOrDefault(item => item.TypeId == 2004)?.ObjectDatas.FirstOrDefault();
                if (lobbyPayload is { Length: > 0 })
                {
                    return DeserializeBytes<CSODOTALobby>(lobbyPayload);
                }
            }

            if (message.MessageType == 21)
            {
                var single = Deserialize<CMsgSOSingleObject>(message.PayloadBase64);
                if (single.TypeId == 2004 && single.ObjectData is { Length: > 0 })
                {
                    return DeserializeBytes<CSODOTALobby>(single.ObjectData);
                }
            }
        }

        return null;
    }

    private static CSOEconItem[] ServerEconItems(
        IEnumerable<ApiGCMessage> directMessages,
        IEnumerable<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        ulong serverSteamId)
    {
        var messages = directMessages
            .Concat(queuedMessages.Where(item => item.SteamId == serverSteamId).Select(item => item.Message))
            .Where(message => message.MessageType == 24);
        var result = new List<CSOEconItem>();
        foreach (var message in messages)
        {
            var cache = Deserialize<CMsgSOCacheSubscribed>(message.PayloadBase64);
            if (cache.ServiceId != 1)
            {
                continue;
            }

            var itemType = cache.Objects.FirstOrDefault(item => item.TypeId == 1);
            if (itemType == null)
            {
                continue;
            }

            foreach (var payload in itemType.ObjectDatas)
            {
                result.Add(DeserializeBytes<CSOEconItem>(payload));
            }
        }

        return result.ToArray();
    }

    private static CMsgSOCacheSubscribed[] ServerOwnerGameCaches(
        IEnumerable<ApiGCMessage> directMessages,
        IEnumerable<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        ulong serverSteamId)
    {
        return directMessages
            .Concat(queuedMessages.Where(item => item.SteamId == serverSteamId).Select(item => item.Message))
            .Where(message => message.MessageType == 24)
            .Select(message => Deserialize<CMsgSOCacheSubscribed>(message.PayloadBase64))
            .Where(cache => cache.ServiceId == 0 && cache.OwnerSoid?.Type == 1 && cache.OwnerSoid.Id != serverSteamId)
            .ToArray();
    }

    private static CSOEconItem[] ServerSingleEconItems(
        IEnumerable<(ulong SteamId, ApiGCMessage Message)> queuedMessages,
        ulong serverSteamId)
    {
        var result = new List<CSOEconItem>();
        foreach (var message in queuedMessages.Where(item => item.SteamId == serverSteamId).Select(item => item.Message))
        {
            if (message.MessageType != 21)
            {
                continue;
            }

            var single = Deserialize<CMsgSOSingleObject>(message.PayloadBase64);
            if (single.ServiceId != 1 || single.TypeId != 1 || single.ObjectData.Length == 0)
            {
                continue;
            }

            result.Add(DeserializeBytes<CSOEconItem>(single.ObjectData));
        }

        return result.ToArray();
    }

    private sealed class SelfCheckInventoryFixture
    {
        private const uint UnequipSlot = 65535;
        private ulong _version = 4242;
        private readonly ApiDotaItem _itemA = new()
        {
            DefIndex = 1001,
            Name = "Self-check equipped item",
            Slot = "weapon",
            QualityId = 6,
            HeroIds = new List<uint> { 1 },
            HeroNames = new List<string> { "npc_dota_hero_antimage" }
        };
        private readonly ApiDotaItem _itemB = new()
        {
            DefIndex = 1002,
            Name = "Self-check visible inventory item",
            Slot = "head",
            QualityId = 6,
            HeroIds = new List<uint> { 1 },
            HeroNames = new List<string> { "npc_dota_hero_antimage" }
        };
        private readonly ApiDotaItem _globalItem = new()
        {
            DefIndex = 1003,
            Name = "Self-check global terrain",
            Slot = "terrain",
            QualityId = 6
        };
        private readonly Dictionary<ulong, List<ApiDotaEquipment>> _equipment = new();

        public ApiDotaRuntimeInventory GetInventory(ulong steamId)
        {
            return new ApiDotaRuntimeInventory
            {
                SteamId = steamId,
                Version = _version,
                Items = new List<ApiDotaItem> { CloneItem(_itemA), CloneItem(_itemB), CloneItem(_globalItem) },
                OwnedItems = new List<ApiDotaItem> { CloneItem(_itemA), CloneItem(_globalItem) },
                Equipment = GetEquipment(steamId).Select(CloneEquipment).ToList()
            };
        }

        public List<ApiDotaEquipment> EquipItem(ulong steamId, ulong itemId, uint heroId, uint slotId, uint style)
        {
            var defIndex = ResolveDefIndex(steamId, itemId);
            if (defIndex == 0 && itemId != 0)
            {
                return new List<ApiDotaEquipment>();
            }

            var equipment = GetEquipment(steamId);
            var isUnequip = slotId == UnequipSlot;
            var removed = equipment
                .Where(existing =>
                    (isUnequip && defIndex != 0 && existing.HeroId == heroId && existing.DefIndex == defIndex) ||
                    (!isUnequip && existing.HeroId == heroId && existing.SlotId == slotId) ||
                    (!isUnequip && defIndex != 0 && existing.HeroId == heroId && existing.DefIndex == defIndex))
                .Select(CloneEquipment)
                .ToList();
            equipment.RemoveAll(existing =>
                (isUnequip && defIndex != 0 && existing.HeroId == heroId && existing.DefIndex == defIndex) ||
                (!isUnequip && existing.HeroId == heroId && existing.SlotId == slotId) ||
                (!isUnequip && defIndex != 0 && existing.HeroId == heroId && existing.DefIndex == defIndex));

            if (defIndex == 0 || isUnequip)
            {
                if (removed.Count > 0)
                {
                    _version++;
                }

                return removed;
            }

            var catalogItem = ItemForDefIndex(defIndex);
            var equipped = new ApiDotaEquipment
            {
                SteamId = steamId,
                HeroId = heroId,
                HeroName = catalogItem?.HeroNames.FirstOrDefault() ?? $"hero_{heroId}",
                Slot = catalogItem?.Slot ?? $"slot_{slotId}",
                SlotId = slotId,
                DefIndex = defIndex,
                ItemId = BuildDotaItemInstanceId(steamId, defIndex),
                Style = style == 255 ? 0 : style,
                UpdatedAt = DateTime.UtcNow
            };
            equipment.Add(equipped);
            removed.Add(CloneEquipment(equipped));
            _version++;
            return removed;
        }

        public List<ApiDotaEquipment> SetItemStyle(ulong steamId, ulong itemId, uint style)
        {
            var defIndex = ResolveDefIndex(steamId, itemId);
            var changed = new List<ApiDotaEquipment>();
            foreach (var equipped in GetEquipment(steamId).Where(item => item.DefIndex == defIndex))
            {
                equipped.Style = style == 255 ? 0 : style;
                equipped.UpdatedAt = DateTime.UtcNow;
                changed.Add(CloneEquipment(equipped));
            }

            if (changed.Count > 0)
            {
                _version++;
            }

            return changed;
        }

        private List<ApiDotaEquipment> GetEquipment(ulong steamId)
        {
            if (_equipment.TryGetValue(steamId, out var equipment))
            {
                return equipment;
            }

            equipment = new List<ApiDotaEquipment>
            {
                new()
                {
                    SteamId = steamId,
                    HeroId = 1,
                    HeroName = "npc_dota_hero_antimage",
                    Slot = "weapon",
                    SlotId = 3,
                    DefIndex = _itemA.DefIndex,
                    ItemId = BuildDotaItemInstanceId(steamId, _itemA.DefIndex),
                    Style = 0,
                    UpdatedAt = DateTime.UtcNow
                },
                new()
                {
                    SteamId = steamId,
                    HeroId = 1000,
                    HeroName = "hero_1000",
                    Slot = "terrain",
                    SlotId = 14,
                    DefIndex = _globalItem.DefIndex,
                    ItemId = BuildDotaItemInstanceId(steamId, _globalItem.DefIndex),
                    Style = 0,
                    UpdatedAt = DateTime.UtcNow
                }
            };
            _equipment[steamId] = equipment;
            return equipment;
        }

        private uint ResolveDefIndex(ulong steamId, ulong itemId)
        {
            if (itemId == 0)
            {
                return 0;
            }

            foreach (var item in new[] { _itemA, _itemB, _globalItem })
            {
                if (BuildDotaItemInstanceId(steamId, item.DefIndex) == itemId)
                {
                    return item.DefIndex;
                }
            }

            return 0;
        }

        private ApiDotaItem? ItemForDefIndex(uint defIndex)
        {
            if (_itemA.DefIndex == defIndex)
            {
                return _itemA;
            }

            if (_itemB.DefIndex == defIndex)
            {
                return _itemB;
            }

            if (_globalItem.DefIndex == defIndex)
            {
                return _globalItem;
            }

            return null;
        }
    }

    private static ApiDotaItem CloneItem(ApiDotaItem item)
    {
        return new ApiDotaItem
        {
            DefIndex = item.DefIndex,
            Name = item.Name,
            Prefab = item.Prefab,
            Slot = item.Slot,
            Quality = item.Quality,
            QualityId = item.QualityId,
            Rarity = item.Rarity,
            RarityId = item.RarityId,
            ImageInventory = item.ImageInventory,
            IsDefault = item.IsDefault,
            IsTool = item.IsTool,
            IsBundle = item.IsBundle,
            HeroIds = item.HeroIds.ToList(),
            HeroNames = item.HeroNames.ToList()
        };
    }

    private static ApiDotaEquipment CloneEquipment(ApiDotaEquipment equipment)
    {
        return new ApiDotaEquipment
        {
            SteamId = equipment.SteamId,
            HeroId = equipment.HeroId,
            HeroName = equipment.HeroName,
            Slot = equipment.Slot,
            SlotId = equipment.SlotId,
            DefIndex = equipment.DefIndex,
            ItemId = equipment.ItemId,
            Style = equipment.Style,
            UpdatedAt = equipment.UpdatedAt
        };
    }

    private static uint IpToUInt32(byte a, byte b, byte c, byte d)
    {
        return (uint)(a | (b << 8) | (c << 16) | (d << 24));
    }

    private static ulong BuildDotaItemInstanceId(ulong steamId, uint defIndex)
    {
        var accountBits = steamId & 0xFFFFFFFFUL;
        return 0x7000000000000000UL | (accountBits << 20) | defIndex;
    }

    private static uint AccountIdFromSteamId(ulong steamId)
    {
        return steamId >= 76561197960265728UL
            ? unchecked((uint)(steamId - 76561197960265728UL))
            : unchecked((uint)steamId);
    }

    private static uint? ReadUInt32LittleEndian(byte[]? value)
    {
        return value is { Length: 4 }
            ? BitConverter.ToUInt32(value, 0)
            : null;
    }

    private static byte[] Serialize<TMessage>(TMessage message)
    {
        using var stream = new MemoryStream();
        ProtoBuf.Serializer.Serialize(stream, message);
        return stream.ToArray();
    }

    private static TMessage Deserialize<TMessage>(string? payloadBase64)
    {
        return DeserializeBytes<TMessage>(Convert.FromBase64String(payloadBase64 ?? string.Empty));
    }

    private static TMessage DeserializeBytes<TMessage>(byte[] payload)
    {
        using var stream = new MemoryStream(payload);
        return ProtoBuf.Serializer.Deserialize<TMessage>(stream);
    }

    private static string ResolveContentRoot(string start)
    {
        var current = new DirectoryInfo(start);
        while (current != null)
        {
            if (GameCoordinatorAppCatalog.IsValidRoot(Path.Combine(current.FullName, "GC")))
            {
                return current.FullName;
            }

            var nested = Path.Combine(current.FullName, "SKYNET server");
            if (GameCoordinatorAppCatalog.IsValidRoot(Path.Combine(nested, "GC")))
            {
                return nested;
            }

            current = current.Parent;
        }

        return start;
    }

    private sealed class SelfCheckEnvironment : IHostEnvironment
    {
        public SelfCheckEnvironment(string contentRootPath)
        {
            ContentRootPath = contentRootPath;
            ContentRootFileProvider = new PhysicalFileProvider(contentRootPath);
        }

        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "SKYNET server";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; }
    }
}
