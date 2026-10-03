using Microsoft.Data.Sqlite;
using System.Text.Json.Nodes;

namespace Zentro.Api.Infrastructure.Persistence;

/// <summary>Stores a snapshot as settings and ordered collections, inside one transaction.</summary>
public sealed class ProfileRepository(SqliteConnectionFactory connections) : IProfileRepository
{
    public bool IsHealthy()
    {
        using var connection = connections.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1";
        return Convert.ToInt32(command.ExecuteScalar()) == 1;
    }

    public string? Read()
    {
        using var connection = connections.Open();
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT document FROM profile_settings WHERE id=1";
        var settings = command.ExecuteScalar() as string;

        if (settings is null)
        {
            command.CommandText = "SELECT document FROM app_state WHERE id=1";
            var legacyDocument = command.ExecuteScalar() as string;
            transaction.Commit();
            return legacyDocument;
        }

        var profile = JsonNode.Parse(settings)!.AsObject();
        foreach (var collection in ProfileCollections.All)
        {
            command.CommandText = $"SELECT payload FROM {collection.Table} ORDER BY row_order";
            using var reader = command.ExecuteReader();
            var rows = new JsonArray();
            while (reader.Read())
            {
                rows.Add(JsonNode.Parse(reader.GetString(0)));
            }

            CollectionParent(profile, collection)[collection.Property] = rows;
        }

        transaction.Commit();
        return profile.ToJsonString();
    }

    public void Write(string document)
    {
        var profile = JsonNode.Parse(document)!.AsObject();
        using var connection = connections.Open();
        using var transaction = connection.BeginTransaction();

        foreach (var collection in ProfileCollections.All)
        {
            var parent = CollectionParent(profile, collection);
            var rows = parent[collection.Property]?.AsArray() ?? new JsonArray();
            ReplaceCollection(connection, transaction, collection, rows);
            parent.Remove(collection.Property);
        }

        SaveSettings(connection, transaction, profile);
        transaction.Commit();
    }

    private static JsonObject CollectionParent(JsonObject profile, ProfileCollection collection) =>
        collection.Parent == "" ? profile : profile[collection.Parent]!.AsObject();

    private static void ReplaceCollection(SqliteConnection connection, SqliteTransaction transaction, ProfileCollection collection, JsonArray rows)
    {
        using var clear = connection.CreateCommand();
        clear.Transaction = transaction;
        clear.CommandText = $"DELETE FROM {collection.Table}";
        clear.ExecuteNonQuery();

        var order = 0;
        foreach (var node in rows)
        {
            var row = node!.AsObject();
            using var insert = connection.CreateCommand();
            insert.Transaction = transaction;
            insert.CommandText = $"""
                INSERT INTO {collection.Table}(record_key,row_order,month,amount,payload)
                VALUES($key,$order,$month,$amount,$payload)
                """;
            // Only validated contract fields populate index columns; extra JSON stays in payload.
            var key = row[collection.Key]!.GetValue<string>();
            var period = collection.Period is null ? null : row[collection.Period]?.GetValue<string>();
            var month = collection.Period == "date" ? period?[..7] : period;
            var amount = collection.Amount is null ? null : row[collection.Amount]?.GetValue<long>();
            insert.Parameters.AddWithValue("$key", key);
            insert.Parameters.AddWithValue("$order", order++);
            insert.Parameters.AddWithValue("$month", (object?)month ?? DBNull.Value);
            insert.Parameters.AddWithValue("$amount", (object?)amount ?? DBNull.Value);
            insert.Parameters.AddWithValue("$payload", row.ToJsonString());
            insert.ExecuteNonQuery();
        }
    }

    private static void SaveSettings(SqliteConnection connection, SqliteTransaction transaction, JsonObject settings)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO profile_settings(id,document) VALUES(1,$settings)
            ON CONFLICT(id) DO UPDATE SET document=excluded.document;
            INSERT INTO app_state(id,document,updated_at) VALUES(1,'{"version":2}',$updated)
            ON CONFLICT(id) DO UPDATE SET document=excluded.document,updated_at=excluded.updated_at;
            """;
        command.Parameters.AddWithValue("$settings", settings.ToJsonString());
        command.Parameters.AddWithValue("$updated", DateTimeOffset.UtcNow.ToString("O"));
        command.ExecuteNonQuery();
    }
}
