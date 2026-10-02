using Microsoft.Data.Sqlite;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Zentro.Api.Data;

public sealed class ProfileRepository
{
    private readonly string connectionString;
    private static readonly (string Table, string Parent, string Property)[] Collections = [
        ("savings_months", "", "savings"), ("investment_months", "", "investment"),
        ("daily_expenses", "daily", "expenses"), ("daily_incomes", "daily", "incomes"),
        ("interest_entries", "interest", "entries"), ("internal_debt_items", "internalDebt", "items"),
        ("internal_debt_payments", "internalDebt", "payments"), ("internal_debt_schedule", "internalDebt", "schedule"),
        ("commitments", "", "commitments"), ("possible_expenses", "", "possibleExpenses"),
        ("external_debts", "", "debts"), ("savings_placements", "", "savingsPlacements")
    ];
    public ProfileRepository(IConfiguration configuration, IHostEnvironment environment)
    {
        var path=Path.GetFullPath(configuration["Zentro:DatabasePath"]??"Data/zentro.db",environment.ContentRootPath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        connectionString=new SqliteConnectionStringBuilder {DataSource=path}.ToString();
    }
    private SqliteConnection Open() { var connection=new SqliteConnection(connectionString);connection.Open();return connection; }
    public void Initialize()
    {
        using var connection=Open();
        using var command=connection.CreateCommand();
        command.CommandText="""
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL CHECK(json_valid(document)), updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS profile_settings (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL CHECK(json_valid(document)));
            """;
        command.ExecuteNonQuery();
        foreach(var collection in Collections)
        {
            command.CommandText=$"CREATE TABLE IF NOT EXISTS {collection.Table} (record_key TEXT PRIMARY KEY, row_order INTEGER NOT NULL, month TEXT, amount INTEGER, payload TEXT NOT NULL CHECK(json_valid(payload))); CREATE INDEX IF NOT EXISTS ix_{collection.Table}_month ON {collection.Table}(month);";
            command.ExecuteNonQuery();
        }
    }
    public bool IsHealthy() { using var connection=Open();using var command=connection.CreateCommand();command.CommandText="SELECT 1";return Convert.ToInt32(command.ExecuteScalar())==1; }
    public string? Read()
    {
        using var connection=Open();
        using var transaction=connection.BeginTransaction();
        using var command=connection.CreateCommand();command.Transaction=transaction;
        command.CommandText="SELECT document FROM profile_settings WHERE id=1";
        var settings=command.ExecuteScalar() as string;
        if(settings is null) { command.CommandText="SELECT document FROM app_state WHERE id=1";return command.ExecuteScalar() as string; }
        var profile=JsonNode.Parse(settings)!.AsObject();
        foreach(var collection in Collections)
        {
            command.CommandText=$"SELECT payload FROM {collection.Table} ORDER BY row_order";
            using var reader=command.ExecuteReader();
            var rows=new JsonArray();
            while(reader.Read())rows.Add(JsonNode.Parse(reader.GetString(0)));
            var parent=collection.Parent==""?profile:profile[collection.Parent]!.AsObject();
            parent[collection.Property]=rows;
        }
        transaction.Commit();return profile.ToJsonString();
    }
    public void Write(string document)
    {
        var profile=JsonNode.Parse(document)!.AsObject();
        using var connection=Open();using var transaction=connection.BeginTransaction();
        foreach(var collection in Collections)
        {
            var parent=collection.Parent==""?profile:profile[collection.Parent]!.AsObject();
            var rows=parent[collection.Property]?.AsArray() ?? new JsonArray();
            using var clear=connection.CreateCommand();clear.Transaction=transaction;clear.CommandText=$"DELETE FROM {collection.Table}";clear.ExecuteNonQuery();
            var order=0;
            foreach(var node in rows)
            {
                var row=node!.AsObject();
                using var insert=connection.CreateCommand();insert.Transaction=transaction;
                insert.CommandText=$"INSERT INTO {collection.Table}(record_key,row_order,month,amount,payload) VALUES($key,$order,$month,$amount,$payload)";
                insert.Parameters.AddWithValue("$key",row["id"]?.GetValue<string>()??row["month"]!.GetValue<string>());
                insert.Parameters.AddWithValue("$order",order++);
                insert.Parameters.AddWithValue("$month",(object?)(row["month"]?.GetValue<string>()??row["date"]?.GetValue<string>()[..7])??DBNull.Value);
                insert.Parameters.AddWithValue("$amount",(object?)(row["amount"]?.GetValue<long>()??row["actual"]?.GetValue<long>())??DBNull.Value);
                insert.Parameters.AddWithValue("$payload",row.ToJsonString());insert.ExecuteNonQuery();
            }
            parent.Remove(collection.Property);
        }
        using var metadata=connection.CreateCommand();metadata.Transaction=transaction;
        metadata.CommandText="""
            INSERT INTO profile_settings(id,document) VALUES(1,$settings) ON CONFLICT(id) DO UPDATE SET document=excluded.document;
            INSERT INTO app_state(id,document,updated_at) VALUES(1,'{"version":2}',$updated) ON CONFLICT(id) DO UPDATE SET document=excluded.document,updated_at=excluded.updated_at;
            """;
        metadata.Parameters.AddWithValue("$settings",profile.ToJsonString());metadata.Parameters.AddWithValue("$updated",DateTimeOffset.UtcNow.ToString("O"));metadata.ExecuteNonQuery();
        transaction.Commit();
    }
}
