using Microsoft.Data.Sqlite;

namespace Zentro.Api.Infrastructure.Persistence;

public sealed class SqliteConnectionFactory
{
    private readonly string connectionString;
    public string DatabasePath { get; }
    public string BackupDirectory { get; }

    public SqliteConnectionFactory(IConfiguration configuration, IHostEnvironment environment)
    {
        DatabasePath = Path.GetFullPath(configuration["Zentro:DatabasePath"] ?? "Data/zentro.db", environment.ContentRootPath);
        BackupDirectory = Path.GetFullPath(configuration["Zentro:BackupDirectory"] ??
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Zentro", "backups"), environment.ContentRootPath);
        Directory.CreateDirectory(Path.GetDirectoryName(DatabasePath)!);
        connectionString = new SqliteConnectionStringBuilder { DataSource = DatabasePath, ForeignKeys = true }.ToString();
    }

    public SqliteConnection Open()
    {
        var connection = new SqliteConnection(connectionString);
        connection.Open();
        return connection;
    }
}
