using System.Text.Json;

namespace Zentro.Api.Data;

// Valida el contrato de almacenamiento. Los cálculos financieros siguen en finance.ts.
public static class StateValidator
{
    private static bool Text(JsonElement item, string key) =>
        item.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String;
    private static bool Integer(JsonElement item, string key) =>
        item.TryGetProperty(key, out var value) && value.TryGetInt64(out var number)
        && Math.Abs((decimal)number) <= 9007199254740991;
    public static bool IsValid(JsonElement state)
    {
        try
        {
            if (state.ValueKind != JsonValueKind.Object
                || !state.TryGetProperty("version", out var version) || !version.TryGetInt32(out var v) || v != 1
                || !state.TryGetProperty("demo", out var demo) || demo.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
            foreach (var name in new[] { "accounts", "debts", "entries", "goals", "categories" })
                if (!state.TryGetProperty(name, out var array) || array.ValueKind != JsonValueKind.Array) return false;
            foreach (var category in state.GetProperty("categories").EnumerateArray())
                if (category.ValueKind != JsonValueKind.String) return false;
            foreach (var name in new[] { "accounts", "debts", "entries", "goals" })
            {
                var ids = new HashSet<string>();
                foreach (var item in state.GetProperty(name).EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.Object || !Text(item, "id")
                        || string.IsNullOrWhiteSpace(item.GetProperty("id").GetString())
                        || !ids.Add(item.GetProperty("id").GetString()!)) return false;
                    if (!Text(item, "date") || !DateOnly.TryParseExact(item.GetProperty("date").GetString(), "yyyy-MM-dd", out _)) return false;
                    if (name == "accounts" && (!Text(item, "name") || !Text(item, "bank") || !Integer(item, "opening")
                        || !Text(item, "kind") || !new[] { "daily", "savings", "investment", "cash" }.Contains(item.GetProperty("kind").GetString()))) return false;
                    if (name == "debts" && (!Text(item, "name") || !Text(item, "description") || !Integer(item, "original")
                        || !Integer(item, "initialPaid") || !Integer(item, "monthly") || !Text(item, "kind")
                        || !new[] { "external", "internal" }.Contains(item.GetProperty("kind").GetString()))) return false;
                    if (name == "entries" && (!Text(item, "concept") || !Text(item, "category") || !Integer(item, "amount")
                        || !Integer(item, "reserved") || !Text(item, "from") || !Text(item, "to") || !Text(item, "debt")
                        || !Text(item, "status") || !new[] { "done", "planned" }.Contains(item.GetProperty("status").GetString())
                        || !Text(item, "kind") || !new[] { "income", "expense", "transfer", "saving", "investment", "repayment", "debt", "interest", "withdrawal" }.Contains(item.GetProperty("kind").GetString()))) return false;
                    if (name == "goals" && (!Text(item, "name") || !Text(item, "account") || !Integer(item, "target"))) return false;
                }
            }
            return true;
        }
        catch (InvalidOperationException) { return false; }
    }
}
