using Microsoft.Data.Sqlite;

namespace Zentro.Api.Data;

public sealed class StateRepository
{
    private readonly string connectionString;
    public StateRepository(IConfiguration configuration, IHostEnvironment environment)
    {
        var path = Path.GetFullPath(configuration["Zentro:DatabasePath"] ?? "Data/zentro.db", environment.ContentRootPath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        connectionString = new SqliteConnectionStringBuilder { DataSource = path }.ToString();
    }
    private SqliteConnection Open()
    {
        var connection = new SqliteConnection(connectionString);
        connection.Open();
        return connection;
    }
    public void Initialize()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                document TEXT NOT NULL CHECK (json_valid(document)),
                updated_at TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }
    public bool IsHealthy()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1";
        return Convert.ToInt32(command.ExecuteScalar()) == 1;
    }
    public string? Read()
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT document FROM app_state WHERE id = 1";
        return command.ExecuteScalar() as string;
    }
    public void Write(string document)
    {
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO app_state (id, document, updated_at) VALUES (1, $document, $updated)
            ON CONFLICT(id) DO UPDATE SET document = excluded.document, updated_at = excluded.updated_at;
            """;
        command.Parameters.AddWithValue("$document", document);
        command.Parameters.AddWithValue("$updated", DateTimeOffset.UtcNow.ToString("O"));
        command.ExecuteNonQuery();
    }
}
