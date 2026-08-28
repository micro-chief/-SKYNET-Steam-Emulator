using Microsoft.Data.Sqlite;

namespace SKYNET_server.Services;

public enum Cs2ReservationState : uint
{
    Pending = 1,
    Confirmed = 2
}

public sealed record Cs2ActiveReservation(
    ulong ReservationId,
    ulong ServerId,
    ulong MatchId,
    uint GameType,
    uint ServerVersion,
    uint DirectUdpIp,
    uint DirectUdpPort,
    string ServerAddress,
    string Map,
    Cs2ReservationState State,
    IReadOnlyList<uint> AccountIds);

public sealed record Cs2ReservationPlayer(uint AccountId, ulong SteamId);

public sealed record Cs2FinishedReservation(
    ulong ReservationId,
    ulong ServerId,
    ulong MatchId,
    IReadOnlyList<Cs2ReservationPlayer> Players);

/// <summary>
/// Persistent AppID 730 reservation state used to restore ongoingmatch after a
/// client or the emulator reconnects. Numeric Steam identifiers are stored as
/// text because SQLite INTEGER is signed while the wire values are uint64.
/// </summary>
public sealed class Cs2MatchStore
{
    private readonly object _sync = new();
    private readonly string _dbPath;

    public Cs2MatchStore(string dbPath)
    {
        _dbPath = AppDatabase.PrepareDatabase(dbPath, path =>
        {
            using var connection = AppDatabase.OpenConnection(path);
            using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE IF NOT EXISTS cs2_match_reservations (
                    reservation_id TEXT PRIMARY KEY,
                    server_id TEXT NOT NULL,
                    match_id TEXT NOT NULL,
                    game_type INTEGER NOT NULL,
                    server_version INTEGER NOT NULL,
                    direct_udp_ip INTEGER NOT NULL,
                    direct_udp_port INTEGER NOT NULL,
                    server_address TEXT NOT NULL,
                    map TEXT NOT NULL,
                    state INTEGER NOT NULL,
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cs2_match_players (
                    reservation_id TEXT NOT NULL,
                    account_id INTEGER NOT NULL,
                    steam_id TEXT NOT NULL DEFAULT '0',
                    PRIMARY KEY (reservation_id, account_id),
                    FOREIGN KEY (reservation_id) REFERENCES cs2_match_reservations(reservation_id)
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS ix_cs2_match_players_account
                    ON cs2_match_players (account_id);
                """;
            command.ExecuteNonQuery();
            EnsureColumn(connection, "cs2_match_players", "steam_id", "TEXT NOT NULL DEFAULT '0'");
        });
    }

    public string DatabasePath => _dbPath;

    public bool Activate(
        Cs2LanReservation reservation,
        uint gameType,
        uint serverVersion,
        IReadOnlyCollection<uint> accountIds,
        uint initiatingAccountId = 0,
        ulong initiatingSteamId = 0)
    {
        var players = accountIds.Where(value => value != 0).Distinct().ToArray();
        if (reservation.ReservationId == 0 || players.Length == 0)
        {
            return false;
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();

            using (var reservationCommand = connection.CreateCommand())
            {
                reservationCommand.Transaction = transaction;
                reservationCommand.CommandText = """
                    INSERT INTO cs2_match_reservations (
                        reservation_id, server_id, match_id, game_type, server_version,
                        direct_udp_ip, direct_udp_port, server_address, map, state, created_at)
                    VALUES (
                        $reservation_id, $server_id, $match_id, $game_type, $server_version,
                        $direct_udp_ip, $direct_udp_port, $server_address, $map, $state, $created_at)
                    ON CONFLICT (reservation_id) DO UPDATE SET
                        server_id = excluded.server_id,
                        match_id = excluded.match_id,
                        game_type = excluded.game_type,
                        server_version = excluded.server_version,
                        direct_udp_ip = excluded.direct_udp_ip,
                        direct_udp_port = excluded.direct_udp_port,
                        server_address = excluded.server_address,
                        map = excluded.map,
                        state = excluded.state;
                    """;
                Add(reservationCommand, "$reservation_id", reservation.ReservationId.ToString());
                Add(reservationCommand, "$server_id", reservation.ServerId.ToString());
                Add(reservationCommand, "$match_id", reservation.MatchId.ToString());
                Add(reservationCommand, "$game_type", gameType);
                Add(reservationCommand, "$server_version", serverVersion);
                Add(reservationCommand, "$direct_udp_ip", reservation.DirectUdpIp);
                Add(reservationCommand, "$direct_udp_port", reservation.DirectUdpPort);
                Add(reservationCommand, "$server_address", reservation.ServerAddress);
                Add(reservationCommand, "$map", reservation.Map);
                Add(reservationCommand, "$state", (uint)Cs2ReservationState.Pending);
                Add(reservationCommand, "$created_at", DateTimeOffset.UtcNow.ToUnixTimeSeconds());
                reservationCommand.ExecuteNonQuery();
            }

            foreach (var accountId in players)
            {
                // An account can have only one ongoing local match. Remove its
                // older association before attaching the new reservation.
                using (var detach = connection.CreateCommand())
                {
                    detach.Transaction = transaction;
                    detach.CommandText = "DELETE FROM cs2_match_players WHERE account_id = $account_id;";
                    Add(detach, "$account_id", accountId);
                    detach.ExecuteNonQuery();
                }

                using var attach = connection.CreateCommand();
                attach.Transaction = transaction;
                attach.CommandText = """
                    INSERT INTO cs2_match_players (reservation_id, account_id, steam_id)
                    VALUES ($reservation_id, $account_id, $steam_id)
                    ON CONFLICT (reservation_id, account_id) DO UPDATE SET
                        steam_id = CASE
                            WHEN excluded.steam_id <> '0' THEN excluded.steam_id
                            ELSE cs2_match_players.steam_id
                        END;
                    """;
                Add(attach, "$reservation_id", reservation.ReservationId.ToString());
                Add(attach, "$account_id", accountId);
                Add(attach, "$steam_id",
                    accountId == initiatingAccountId ? initiatingSteamId.ToString() : "0");
                attach.ExecuteNonQuery();
            }

            DeleteOrphans(connection, transaction);
            transaction.Commit();
            return true;
        }
    }

    public Cs2ActiveReservation? GetForAccount(uint accountId)
    {
        if (accountId == 0)
        {
            return null;
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT r.reservation_id, r.server_id, r.match_id, r.game_type,
                       r.server_version, r.direct_udp_ip, r.direct_udp_port,
                       r.server_address, r.map, r.state
                FROM cs2_match_reservations r
                INNER JOIN cs2_match_players p ON p.reservation_id = r.reservation_id
                WHERE p.account_id = $account_id
                ORDER BY r.created_at DESC
                LIMIT 1;
                """;
            Add(command, "$account_id", accountId);
            using var reader = command.ExecuteReader();
            if (!reader.Read()
                || !ulong.TryParse(reader.GetString(0), out var reservationId)
                || !ulong.TryParse(reader.GetString(1), out var serverId)
                || !ulong.TryParse(reader.GetString(2), out var matchId))
            {
                return null;
            }

            var gameType = checked((uint)reader.GetInt64(3));
            var serverVersion = checked((uint)reader.GetInt64(4));
            var directUdpIp = checked((uint)reader.GetInt64(5));
            var directUdpPort = checked((uint)reader.GetInt64(6));
            var serverAddress = reader.GetString(7);
            var map = reader.GetString(8);
            var state = (Cs2ReservationState)checked((uint)reader.GetInt64(9));
            reader.Close();
            var accounts = ReadAccounts(connection, reservationId);
            return new Cs2ActiveReservation(
                reservationId,
                serverId,
                matchId,
                gameType,
                serverVersion,
                directUdpIp,
                directUdpPort,
                serverAddress,
                map,
                state,
                accounts);
        }
    }

    public bool Confirm(ulong reservationId, ulong serverId)
    {
        if (reservationId == 0 || serverId == 0)
        {
            return false;
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE cs2_match_reservations
                SET state = $state
                WHERE reservation_id = $reservation_id AND server_id = $server_id;
                """;
            Add(command, "$state", (uint)Cs2ReservationState.Confirmed);
            Add(command, "$reservation_id", reservationId.ToString());
            Add(command, "$server_id", serverId.ToString());
            return command.ExecuteNonQuery() == 1;
        }
    }

    public bool BindSession(uint accountId, ulong steamId)
    {
        if (accountId == 0 || steamId == 0)
        {
            return false;
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE cs2_match_players
                SET steam_id = $steam_id
                WHERE account_id = $account_id;
                """;
            Add(command, "$steam_id", steamId.ToString());
            Add(command, "$account_id", accountId);
            return command.ExecuteNonQuery() > 0;
        }
    }

    public Cs2FinishedReservation? Finish(ulong reservationId, ulong serverId)
    {
        if (reservationId == 0 || serverId == 0)
        {
            return null;
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();

            ulong matchId;
            using (var reservation = connection.CreateCommand())
            {
                reservation.Transaction = transaction;
                reservation.CommandText = """
                    SELECT match_id
                    FROM cs2_match_reservations
                    WHERE reservation_id = $reservation_id AND server_id = $server_id;
                    """;
                Add(reservation, "$reservation_id", reservationId.ToString());
                Add(reservation, "$server_id", serverId.ToString());
                var value = reservation.ExecuteScalar() as string;
                if (!ulong.TryParse(value, out matchId))
                {
                    transaction.Rollback();
                    return null;
                }
            }

            var players = new List<Cs2ReservationPlayer>();
            using (var playerCommand = connection.CreateCommand())
            {
                playerCommand.Transaction = transaction;
                playerCommand.CommandText = """
                    SELECT account_id, steam_id
                    FROM cs2_match_players
                    WHERE reservation_id = $reservation_id
                    ORDER BY account_id;
                    """;
                Add(playerCommand, "$reservation_id", reservationId.ToString());
                using var reader = playerCommand.ExecuteReader();
                while (reader.Read())
                {
                    var accountId = checked((uint)reader.GetInt64(0));
                    _ = ulong.TryParse(reader.GetString(1), out var steamId);
                    players.Add(new Cs2ReservationPlayer(accountId, steamId));
                }
            }

            using (var deletePlayers = connection.CreateCommand())
            {
                deletePlayers.Transaction = transaction;
                deletePlayers.CommandText =
                    "DELETE FROM cs2_match_players WHERE reservation_id = $reservation_id;";
                Add(deletePlayers, "$reservation_id", reservationId.ToString());
                deletePlayers.ExecuteNonQuery();
            }

            using (var deleteReservation = connection.CreateCommand())
            {
                deleteReservation.Transaction = transaction;
                deleteReservation.CommandText = """
                    DELETE FROM cs2_match_reservations
                    WHERE reservation_id = $reservation_id AND server_id = $server_id;
                    """;
                Add(deleteReservation, "$reservation_id", reservationId.ToString());
                Add(deleteReservation, "$server_id", serverId.ToString());
                if (deleteReservation.ExecuteNonQuery() != 1)
                {
                    transaction.Rollback();
                    return null;
                }
            }

            transaction.Commit();
            return new Cs2FinishedReservation(reservationId, serverId, matchId, players);
        }
    }

    public bool ClearForAccount(uint accountId)
    {
        if (accountId == 0)
        {
            return false;
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "DELETE FROM cs2_match_players WHERE account_id = $account_id;";
            Add(command, "$account_id", accountId);
            var changed = command.ExecuteNonQuery() > 0;
            DeleteOrphans(connection, transaction);
            transaction.Commit();
            return changed;
        }
    }

    private static IReadOnlyList<uint> ReadAccounts(SqliteConnection connection, ulong reservationId)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT account_id
            FROM cs2_match_players
            WHERE reservation_id = $reservation_id
            ORDER BY account_id;
            """;
        Add(command, "$reservation_id", reservationId.ToString());
        var result = new List<uint>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            result.Add(checked((uint)reader.GetInt64(0)));
        }

        return result;
    }

    private static void DeleteOrphans(SqliteConnection connection, SqliteTransaction transaction)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            DELETE FROM cs2_match_reservations
            WHERE NOT EXISTS (
                SELECT 1 FROM cs2_match_players p
                WHERE p.reservation_id = cs2_match_reservations.reservation_id
            );
            """;
        command.ExecuteNonQuery();
    }

    private static void EnsureColumn(
        SqliteConnection connection,
        string table,
        string column,
        string definition)
    {
        using (var check = connection.CreateCommand())
        {
            check.CommandText = $"PRAGMA table_info({table});";
            using var reader = check.ExecuteReader();
            while (reader.Read())
            {
                if (string.Equals(reader.GetString(1), column, StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }
            }
        }

        using var alter = connection.CreateCommand();
        alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {definition};";
        alter.ExecuteNonQuery();
    }

    private static void Add(SqliteCommand command, string name, object value)
    {
        command.Parameters.AddWithValue(name, value);
    }
}
