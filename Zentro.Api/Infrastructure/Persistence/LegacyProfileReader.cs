using System.Text.Json.Nodes;

namespace Zentro.Api.Infrastructure.Persistence;

/// <summary>Compatibilidad de migración exclusivamente. Nunca se usa para guardar datos nuevos.</summary>
internal static class LegacyProfileReader
{
    private static readonly (string Table, string[] Path)[] Collections =
    [
        ("savings_months", ["savings"]), ("investment_months", ["investment"]),
        ("daily_expenses", ["daily", "expenses"]), ("daily_incomes", ["daily", "incomes"]),
        ("interest_entries", ["interest", "entries"]),
        ("internal_debt_items", ["internalDebt", "items"]),
        ("internal_debt_payments", ["internalDebt", "payments"]),
        ("internal_debt_schedule", ["internalDebt", "schedule"]),
        ("commitments", ["commitments"]), ("possible_expenses", ["possibleExpenses"]),
        ("external_debts", ["debts"]), ("savings_placements", ["savingsPlacements"])
    ];

    public static JsonObject? Read(SqliteSession session, HashSet<string> tables)
    {
        var metadata = tables.Contains("profile_settings")
            ? session.Query("SELECT document FROM profile_settings WHERE id=1", row => row.Text("document")).SingleOrDefault()
            : null;
        if (metadata is not null)
        {
            var profile = JsonNode.Parse(metadata)!.AsObject();
            foreach (var (table, path) in Collections)
            {
                var rows = tables.Contains(table)
                    ? session.Query($"SELECT payload FROM {table} ORDER BY row_order", row => JsonNode.Parse(row.Text("payload")))
                    : [];
                var parent = profile;
                foreach (var segment in path[..^1])
                {
                    parent = parent[segment]!.AsObject();
                }
                parent[path[^1]] = new JsonArray(rows.ToArray());
            }
            return profile;
        }
        var legacy = tables.Contains("app_state")
            ? session.Query("SELECT document FROM app_state WHERE id=1", row => row.Text("document")).SingleOrDefault()
            : null;
        return legacy is null ? null : JsonNode.Parse(legacy)!.AsObject();
    }

    public static void DropTables(SqliteSession session, HashSet<string> tables)
    {
        foreach (var table in Collections.Select(collection => collection.Table).Concat(["profile_settings", "app_state"]))
        {
            if (tables.Contains(table))
            {
                session.Execute($"DROP TABLE {table}");
            }
        }
    }
}
