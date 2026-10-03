using Microsoft.Data.Sqlite;

namespace Zentro.Api.Infrastructure.Persistence;

/// <summary>Operaciones parametrizadas dentro de una única transacción.</summary>
internal sealed class SqliteSession(SqliteConnection connection, SqliteTransaction transaction)
{
    public List<T> Query<T>(string sql, Func<SqliteDataReader, T> map, params (string Name, object? Value)[] parameters)
    {
        using var command = Command(sql, parameters);
        using var reader = command.ExecuteReader();
        var result = new List<T>();
        while (reader.Read())
        {
            result.Add(map(reader));
        }
        return result;
    }

    public void Execute(string sql, params (string Name, object? Value)[] parameters)
    {
        using var command = Command(sql, parameters);
        command.ExecuteNonQuery();
    }

    // Identificadores constantes del código; todos los valores son parámetros, nunca SQL interpolado.
    public void Insert(string table, params (string Name, object? Value)[] columns)
    {
        var names = string.Join(",", columns.Select(column => column.Name));
        var parameters = columns.Select((column, index) => ($"$v{index}", column.Value)).ToArray();
        Execute($"INSERT INTO {table} ({names}) VALUES ({string.Join(",", parameters.Select(parameter => parameter.Item1))})", parameters);
    }

    private SqliteCommand Command(string sql, (string Name, object? Value)[] parameters)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        foreach (var (name, value) in parameters)
        {
            command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }
        return command;
    }
}

internal static class SqliteRow
{
    public static string Text(this SqliteDataReader row, string column) => row.GetString(row.GetOrdinal(column));
    public static string? OptionalText(this SqliteDataReader row, string column) => row.IsDBNull(row.GetOrdinal(column)) ? null : row.Text(column);
    public static long Number(this SqliteDataReader row, string column) => row.GetInt64(row.GetOrdinal(column));
    public static long? OptionalNumber(this SqliteDataReader row, string column) => row.IsDBNull(row.GetOrdinal(column)) ? null : row.Number(column);
    public static int Integer(this SqliteDataReader row, string column) => checked((int)row.Number(column));
    public static int? OptionalInteger(this SqliteDataReader row, string column) => row.IsDBNull(row.GetOrdinal(column)) ? null : row.Integer(column);
    public static bool Flag(this SqliteDataReader row, string column) => row.Number(column) == 1;
}
