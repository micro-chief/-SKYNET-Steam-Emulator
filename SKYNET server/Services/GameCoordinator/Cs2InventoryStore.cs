using Microsoft.Data.Sqlite;

namespace SKYNET_server.Services;

public sealed record Cs2EquipmentBinding(uint ClassId, uint SlotId, ulong ItemId);

public sealed record Cs2InventoryPosition(ulong ItemId, uint Position);

public sealed record Cs2ItemAttributeOverride(ulong ItemId, uint DefIndex, uint ValueBits);

public sealed record Cs2InventoryInstance(ulong ItemId, int TemplateIndex, uint Position);

public sealed record Cs2CreatedInventoryItem(ulong ItemId, int TemplateIndex, ulong Version);

public sealed record Cs2EquipmentSnapshot(
    ulong Version,
    IReadOnlyList<Cs2EquipmentBinding> Bindings,
    IReadOnlyList<Cs2InventoryPosition> Positions,
    IReadOnlyList<Cs2ItemAttributeOverride> ItemAttributes,
    IReadOnlyList<Cs2InventoryInstance> Instances);

/// <summary>
/// Persistent AppID 730 loadout state. Item definitions remain in the script
/// catalog; this store records only the per-account class/slot selection and a
/// monotonically increasing SO version.
/// </summary>
public sealed class Cs2InventoryStore
{
    private readonly object _sync = new();
    private readonly string _dbPath;

    public Cs2InventoryStore(string dbPath)
    {
        _dbPath = AppDatabase.PrepareDatabase(dbPath, path =>
        {
            using var connection = AppDatabase.OpenConnection(path);
            using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE IF NOT EXISTS cs2_inventory_versions (
                    steam_id TEXT PRIMARY KEY,
                    version INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cs2_equipment (
                    steam_id TEXT NOT NULL,
                    class_id INTEGER NOT NULL,
                    slot_id INTEGER NOT NULL,
                    item_id TEXT NOT NULL,
                    PRIMARY KEY (steam_id, class_id, slot_id)
                );

                CREATE INDEX IF NOT EXISTS ix_cs2_equipment_item
                    ON cs2_equipment (steam_id, item_id);

                CREATE TABLE IF NOT EXISTS cs2_item_positions (
                    steam_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    PRIMARY KEY (steam_id, item_id)
                );

                CREATE TABLE IF NOT EXISTS cs2_item_attributes (
                    steam_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    def_index INTEGER NOT NULL,
                    value_bits INTEGER NOT NULL,
                    PRIMARY KEY (steam_id, item_id, def_index)
                );

                CREATE TABLE IF NOT EXISTS cs2_inventory_instances (
                    steam_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    template_index INTEGER NOT NULL,
                    position INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    PRIMARY KEY (steam_id, item_id)
                );

                CREATE INDEX IF NOT EXISTS ix_cs2_inventory_instances_created
                    ON cs2_inventory_instances (steam_id, created_at, item_id);
                """;
            command.ExecuteNonQuery();
        });
    }

    public string DatabasePath => _dbPath;

    public Cs2EquipmentSnapshot Get(ulong steamId)
    {
        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            var version = ReadVersion(connection, steamId);
            using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT class_id, slot_id, item_id
                FROM cs2_equipment
                WHERE steam_id = $steam_id
                ORDER BY class_id, slot_id;
                """;
            Add(command, "$steam_id", steamId.ToString());

            var bindings = new List<Cs2EquipmentBinding>();
            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (!ulong.TryParse(reader.GetString(2), out var itemId))
                    {
                        continue;
                    }

                    bindings.Add(new Cs2EquipmentBinding(
                        checked((uint)reader.GetInt64(0)),
                        checked((uint)reader.GetInt64(1)),
                        itemId));
                }
            }

            using var positionsCommand = connection.CreateCommand();
            positionsCommand.CommandText = """
                SELECT item_id, position
                FROM cs2_item_positions
                WHERE steam_id = $steam_id
                ORDER BY position, item_id;
                """;
            Add(positionsCommand, "$steam_id", steamId.ToString());
            var positions = new List<Cs2InventoryPosition>();
            using (var positionsReader = positionsCommand.ExecuteReader())
            {
                while (positionsReader.Read())
                {
                    if (ulong.TryParse(positionsReader.GetString(0), out var itemId))
                    {
                        positions.Add(new Cs2InventoryPosition(itemId, checked((uint)positionsReader.GetInt64(1))));
                    }
                }
            }

            using var attributesCommand = connection.CreateCommand();
            attributesCommand.CommandText = """
                SELECT item_id, def_index, value_bits
                FROM cs2_item_attributes
                WHERE steam_id = $steam_id
                ORDER BY item_id, def_index;
                """;
            Add(attributesCommand, "$steam_id", steamId.ToString());
            var itemAttributes = new List<Cs2ItemAttributeOverride>();
            using (var attributesReader = attributesCommand.ExecuteReader())
            {
                while (attributesReader.Read())
                {
                    if (ulong.TryParse(attributesReader.GetString(0), out var itemId))
                    {
                        itemAttributes.Add(new Cs2ItemAttributeOverride(
                            itemId,
                            checked((uint)attributesReader.GetInt64(1)),
                            checked((uint)attributesReader.GetInt64(2))));
                    }
                }
            }

            using var instancesCommand = connection.CreateCommand();
            instancesCommand.CommandText = """
                SELECT item_id, template_index, position
                FROM cs2_inventory_instances
                WHERE steam_id = $steam_id
                ORDER BY created_at, item_id;
                """;
            Add(instancesCommand, "$steam_id", steamId.ToString());
            var instances = new List<Cs2InventoryInstance>();
            using (var instancesReader = instancesCommand.ExecuteReader())
            {
                while (instancesReader.Read())
                {
                    if (ulong.TryParse(instancesReader.GetString(0), out var itemId))
                    {
                        instances.Add(new Cs2InventoryInstance(
                            itemId,
                            checked((int)instancesReader.GetInt64(1)),
                            checked((uint)instancesReader.GetInt64(2))));
                    }
                }
            }

            return new Cs2EquipmentSnapshot(version, bindings, positions, itemAttributes, instances);
        }
    }

    public Cs2CreatedInventoryItem CreateItem(
        ulong steamId,
        int templateIndex,
        IReadOnlyList<Cs2ItemAttributeOverride> attributes)
    {
        if (templateIndex < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(templateIndex));
        }

        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();
            EnsureVersion(connection, transaction, steamId);

            ulong itemId;
            do
            {
                itemId = 0x7310000000000000UL | ((ulong)Random.Shared.NextInt64() & 0x000FFFFFFFFFFFFFUL);
            }
            while (ItemExists(connection, transaction, steamId, itemId));

            const uint newItemPosition = 0x40000000;
            using (var insert = connection.CreateCommand())
            {
                insert.Transaction = transaction;
                insert.CommandText = """
                    INSERT INTO cs2_inventory_instances
                        (steam_id, item_id, template_index, position, created_at)
                    VALUES
                        ($steam_id, $item_id, $template_index, $position, $created_at);
                    """;
                Add(insert, "$steam_id", steamId.ToString());
                Add(insert, "$item_id", itemId.ToString());
                Add(insert, "$template_index", templateIndex);
                Add(insert, "$position", newItemPosition);
                Add(insert, "$created_at", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
                insert.ExecuteNonQuery();
            }

            foreach (var attribute in attributes)
            {
                using var insertAttribute = connection.CreateCommand();
                insertAttribute.Transaction = transaction;
                insertAttribute.CommandText = """
                    INSERT INTO cs2_item_attributes (steam_id, item_id, def_index, value_bits)
                    VALUES ($steam_id, $item_id, $def_index, $value_bits)
                    ON CONFLICT (steam_id, item_id, def_index)
                    DO UPDATE SET value_bits = excluded.value_bits;
                    """;
                Add(insertAttribute, "$steam_id", steamId.ToString());
                Add(insertAttribute, "$item_id", itemId.ToString());
                Add(insertAttribute, "$def_index", attribute.DefIndex);
                Add(insertAttribute, "$value_bits", attribute.ValueBits);
                insertAttribute.ExecuteNonQuery();
            }

            var version = BumpVersion(connection, transaction, steamId);
            transaction.Commit();
            return new Cs2CreatedInventoryItem(itemId, templateIndex, version);
        }
    }

    public ulong Set(ulong steamId, uint classId, uint slotId, ulong itemId)
    {
        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();

            using (var ensure = connection.CreateCommand())
            {
                ensure.Transaction = transaction;
                ensure.CommandText = """
                    INSERT INTO cs2_inventory_versions (steam_id, version)
                    VALUES ($steam_id, 1)
                    ON CONFLICT (steam_id) DO NOTHING;
                    """;
                Add(ensure, "$steam_id", steamId.ToString());
                ensure.ExecuteNonQuery();
            }

            using (var update = connection.CreateCommand())
            {
                update.Transaction = transaction;
                if (itemId == 0)
                {
                    update.CommandText = """
                        DELETE FROM cs2_equipment
                        WHERE steam_id = $steam_id AND class_id = $class_id AND slot_id = $slot_id;
                        """;
                }
                else
                {
                    update.CommandText = """
                        INSERT INTO cs2_equipment (steam_id, class_id, slot_id, item_id)
                        VALUES ($steam_id, $class_id, $slot_id, $item_id)
                        ON CONFLICT (steam_id, class_id, slot_id) DO UPDATE SET item_id = excluded.item_id;
                        """;
                    Add(update, "$item_id", itemId.ToString());
                }

                Add(update, "$steam_id", steamId.ToString());
                Add(update, "$class_id", classId);
                Add(update, "$slot_id", slotId);
                update.ExecuteNonQuery();
            }

            ulong version;
            using (var bump = connection.CreateCommand())
            {
                bump.Transaction = transaction;
                bump.CommandText = """
                    UPDATE cs2_inventory_versions
                    SET version = version + 1
                    WHERE steam_id = $steam_id
                    RETURNING version;
                    """;
                Add(bump, "$steam_id", steamId.ToString());
                version = checked((ulong)(long)(bump.ExecuteScalar() ?? 1L));
            }

            transaction.Commit();
            return version;
        }
    }

    public ulong SetPosition(ulong steamId, ulong itemId, uint position)
    {
        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();

            using (var ensure = connection.CreateCommand())
            {
                ensure.Transaction = transaction;
                ensure.CommandText = """
                    INSERT INTO cs2_inventory_versions (steam_id, version)
                    VALUES ($steam_id, 1)
                    ON CONFLICT (steam_id) DO NOTHING;
                    """;
                Add(ensure, "$steam_id", steamId.ToString());
                ensure.ExecuteNonQuery();
            }

            using (var update = connection.CreateCommand())
            {
                update.Transaction = transaction;
                update.CommandText = """
                    INSERT INTO cs2_item_positions (steam_id, item_id, position)
                    VALUES ($steam_id, $item_id, $position)
                    ON CONFLICT (steam_id, item_id) DO UPDATE SET position = excluded.position;
                    """;
                Add(update, "$steam_id", steamId.ToString());
                Add(update, "$item_id", itemId.ToString());
                Add(update, "$position", position);
                update.ExecuteNonQuery();
            }

            ulong version;
            using (var bump = connection.CreateCommand())
            {
                bump.Transaction = transaction;
                bump.CommandText = """
                    UPDATE cs2_inventory_versions
                    SET version = version + 1
                    WHERE steam_id = $steam_id
                    RETURNING version;
                    """;
                Add(bump, "$steam_id", steamId.ToString());
                version = checked((ulong)(long)(bump.ExecuteScalar() ?? 1L));
            }

            transaction.Commit();
            return version;
        }
    }

    public ulong SetAttribute(ulong steamId, ulong itemId, uint defIndex, uint valueBits)
    {
        lock (_sync)
        {
            using var connection = AppDatabase.OpenConnection(_dbPath);
            using var transaction = connection.BeginTransaction();

            using (var ensure = connection.CreateCommand())
            {
                ensure.Transaction = transaction;
                ensure.CommandText = """
                    INSERT INTO cs2_inventory_versions (steam_id, version)
                    VALUES ($steam_id, 1)
                    ON CONFLICT (steam_id) DO NOTHING;
                    """;
                Add(ensure, "$steam_id", steamId.ToString());
                ensure.ExecuteNonQuery();
            }

            using (var update = connection.CreateCommand())
            {
                update.Transaction = transaction;
                update.CommandText = """
                    INSERT INTO cs2_item_attributes (steam_id, item_id, def_index, value_bits)
                    VALUES ($steam_id, $item_id, $def_index, $value_bits)
                    ON CONFLICT (steam_id, item_id, def_index) DO UPDATE SET value_bits = excluded.value_bits;
                    """;
                Add(update, "$steam_id", steamId.ToString());
                Add(update, "$item_id", itemId.ToString());
                Add(update, "$def_index", defIndex);
                Add(update, "$value_bits", valueBits);
                update.ExecuteNonQuery();
            }

            ulong version;
            using (var bump = connection.CreateCommand())
            {
                bump.Transaction = transaction;
                bump.CommandText = """
                    UPDATE cs2_inventory_versions
                    SET version = version + 1
                    WHERE steam_id = $steam_id
                    RETURNING version;
                    """;
                Add(bump, "$steam_id", steamId.ToString());
                version = checked((ulong)(long)(bump.ExecuteScalar() ?? 1L));
            }

            transaction.Commit();
            return version;
        }
    }

    private static ulong ReadVersion(SqliteConnection connection, ulong steamId)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT version FROM cs2_inventory_versions WHERE steam_id = $steam_id;";
        Add(command, "$steam_id", steamId.ToString());
        var value = command.ExecuteScalar();
        return value == null || value == DBNull.Value ? 1UL : checked((ulong)(long)value);
    }

    private static void EnsureVersion(SqliteConnection connection, SqliteTransaction transaction, ulong steamId)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO cs2_inventory_versions (steam_id, version)
            VALUES ($steam_id, 1)
            ON CONFLICT (steam_id) DO NOTHING;
            """;
        Add(command, "$steam_id", steamId.ToString());
        command.ExecuteNonQuery();
    }

    private static ulong BumpVersion(SqliteConnection connection, SqliteTransaction transaction, ulong steamId)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE cs2_inventory_versions
            SET version = version + 1
            WHERE steam_id = $steam_id
            RETURNING version;
            """;
        Add(command, "$steam_id", steamId.ToString());
        return checked((ulong)(long)(command.ExecuteScalar() ?? 1L));
    }

    private static bool ItemExists(
        SqliteConnection connection,
        SqliteTransaction transaction,
        ulong steamId,
        ulong itemId)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT 1
            FROM cs2_inventory_instances
            WHERE steam_id = $steam_id AND item_id = $item_id
            LIMIT 1;
            """;
        Add(command, "$steam_id", steamId.ToString());
        Add(command, "$item_id", itemId.ToString());
        return command.ExecuteScalar() != null;
    }

    private static void Add(SqliteCommand command, string name, object value)
    {
        command.Parameters.AddWithValue(name, value);
    }
}
