using Microsoft.Data.Sqlite;

namespace Zentro.Api.Infrastructure.Persistence;

public sealed class SqliteConnectionFactory
{
    private readonly string connectionString;
    public SqliteConnectionFactory(IConfiguration configuration, IHostEnvironment environment)
    {
        var configuredPath = configuration["Zentro:DatabasePath"] ?? "Data/zentro.db";
        var databasePath = Path.GetFullPath(configuredPath, environment.ContentRootPath);
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();
    }
    public SqliteConnection Open()
    {
        var connection = new SqliteConnection(connectionString);
        connection.Open();
        return connection;
    }
}
