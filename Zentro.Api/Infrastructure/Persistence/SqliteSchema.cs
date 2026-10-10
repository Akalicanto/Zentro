using System.Text.Json;
using Microsoft.Data.Sqlite;
using Zentro.Api.Models;
using Zentro.Api.Validation;

namespace Zentro.Api.Infrastructure.Persistence;

/// <summary>Migraciones de estructura, independientes de la versión del contrato HTTP.</summary>
public sealed class SqliteSchema(SqliteConnectionFactory connections, IProfileValidator validator)
{
    private const int CurrentVersion = 5;
    private static readonly JsonSerializerOptions ComparisonOptions = new(JsonSerializerDefaults.Web);

    public void Initialize()
    {
        using var connection = connections.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA user_version";
        var version = Convert.ToInt32(command.ExecuteScalar());
        if (version > CurrentVersion)
        {
            throw new InvalidOperationException("La base de datos requiere una versión más reciente de Zentro.");
        }
        if (version == CurrentVersion)
        {
            return;
        }
        command.CommandText = "PRAGMA journal_mode=WAL";
        command.ExecuteNonQuery();
        command.CommandText = "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'";
        var tables = new HashSet<string>();
        using (var reader = command.ExecuteReader())
        {
            while (reader.Read())
            {
                tables.Add(reader.GetString(0));
            }
        }
        if (tables.Count > 0)
        {
            Backup(connection);
        }

        if (version is 1 or 2 or 3 or 4)
        {
            using var upgrade = connection.BeginTransaction();
            var upgradeSession = new SqliteSession(connection, upgrade);
            if (version == 1)
            {
                ApplyUndatedForecasts(upgradeSession);
            }

            if (version < 3)
            {
                ApplyDebtManagement(upgradeSession);
            }

            if (version < 4)
            {
                ApplyDebtAdvances(upgradeSession);
            }

            ApplyAdvanceTotals(upgradeSession);
            upgradeSession.Execute($"PRAGMA user_version={CurrentVersion}");
            upgrade.Commit();
            return;
        }

        using var transaction = connection.BeginTransaction();
        var session = new SqliteSession(connection, transaction);
        var document = LegacyProfileReader.Read(session, tables);
        FinancialProfile? profile = null;
        if (document is not null)
        {
            var validation = validator.Validate(JsonSerializer.SerializeToElement(document));
            if (!validation.IsValid)
            {
                throw new InvalidDataException("El perfil anterior no cumple el contrato. Se conserva la base original y su copia privada; la migración no se ha aplicado.");
            }
            profile = validation.Profile!;
        }
        using var schema = typeof(SqliteSchema).Assembly.GetManifestResourceStream("Zentro.Api.Infrastructure.Persistence.Schema.001_relacional.sql")
            ?? throw new InvalidOperationException("No se encuentra el esquema relacional.");
        using var sql = new StreamReader(schema);
        session.Execute(sql.ReadToEnd());
        ApplyUndatedForecasts(session);
        ApplyDebtManagement(session);
        ApplyDebtAdvances(session);
        ApplyAdvanceTotals(session);
        if (profile is not null)
        {
            ProfileRepository.WriteSnapshot(session, profile);
            var restored = ProfileRepository.ReadSnapshot(session)!;
            var expected = profile with { Debts = profile.Debts ?? [], SavingsPlacements = profile.SavingsPlacements ?? [], PossibleExpenses = profile.PossibleExpenses ?? [] };
            if (JsonSerializer.Serialize(expected, ComparisonOptions) != JsonSerializer.Serialize(restored, ComparisonOptions))
            {
                throw new InvalidDataException("La comprobación de datos ha fallado. La migración se ha cancelado sin modificar el perfil original.");
            }
        }
        LegacyProfileReader.DropTables(session, tables);
        session.Execute($"PRAGMA user_version={CurrentVersion}");
        transaction.Commit();
    }

    private static void ApplyUndatedForecasts(SqliteSession session)
    {
        using var resource = typeof(SqliteSchema).Assembly.GetManifestResourceStream("Zentro.Api.Infrastructure.Persistence.Schema.002_previsiones_sin_mes.sql")
            ?? throw new InvalidOperationException("No se encuentra la migración de previsiones.");
        using var sql = new StreamReader(resource);
        session.Execute(sql.ReadToEnd());
    }

    private void Backup(SqliteConnection source)
    {
        Directory.CreateDirectory(connections.BackupDirectory);
        var file = Path.Combine(connections.BackupDirectory, $"zentro.antes-relacional-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss-fffffff}.db");
        using var destination = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = file, Pooling = false }.ToString());
        destination.Open();
        // La API nativa incluye los datos del WAL y produce una copia coherente.
        source.BackupDatabase(destination);
    }

    private static void ApplyDebtManagement(SqliteSession session)
    {
        using var resource = typeof(SqliteSchema).Assembly.GetManifestResourceStream("Zentro.Api.Infrastructure.Persistence.Schema.003_gestion_deudas.sql")
            ?? throw new InvalidOperationException("No se encuentra la migración de deudas.");
        using var sql = new StreamReader(resource);
        session.Execute(sql.ReadToEnd());
    }
    private static void ApplyDebtAdvances(SqliteSession session)
    {
        using var resource = typeof(SqliteSchema).Assembly.GetManifestResourceStream("Zentro.Api.Infrastructure.Persistence.Schema.004_adelantos_deudas.sql")
            ?? throw new InvalidOperationException("No se encuentra la migración de adelantos.");
        using var sql = new StreamReader(resource);
        session.Execute(sql.ReadToEnd());
    }
    private static void ApplyAdvanceTotals(SqliteSession session)
    {
        using var resource = typeof(SqliteSchema).Assembly.GetManifestResourceStream("Zentro.Api.Infrastructure.Persistence.Schema.005_totales_adelantos.sql")
            ?? throw new InvalidOperationException("No se encuentra la migración de totales de adelantos.");
        using var sql = new StreamReader(resource);
        session.Execute(sql.ReadToEnd());
    }
}
