namespace Zentro.Api.Infrastructure.Persistence;

public sealed class SqliteSchema(SqliteConnectionFactory connections)
{
    public void Initialize()
    {
        using var connection = connections.Open();
        using var command = connection.CreateCommand();
        // app_state remains readable for databases created before collection storage.
        command.CommandText = """
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL CHECK(json_valid(document)), updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS profile_settings (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL CHECK(json_valid(document)));
            """;
        command.ExecuteNonQuery();
        foreach (var collection in ProfileCollections.All)
        {
            command.CommandText = $"""
                CREATE TABLE IF NOT EXISTS {collection.Table} (
                    record_key TEXT PRIMARY KEY,
                    row_order INTEGER NOT NULL,
                    month TEXT,
                    amount INTEGER,
                    payload TEXT NOT NULL CHECK(json_valid(payload))
                );
                CREATE INDEX IF NOT EXISTS ix_{collection.Table}_month ON {collection.Table}(month);
                """;
            command.ExecuteNonQuery();
        }
    }
}
