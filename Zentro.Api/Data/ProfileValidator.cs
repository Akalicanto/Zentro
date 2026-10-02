using System.Text.Json;

namespace Zentro.Api.Data;

public static class ProfileValidator
{
    private const decimal Safe = 9007199254740991;
    private static bool Money(JsonElement item, string key, bool nonnegative = false, bool nullable = false)
    {
        if (!item.TryGetProperty(key, out var value)) return false;
        if (nullable && value.ValueKind == JsonValueKind.Null) return true;
        return value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number) && Math.Abs((decimal)number) <= Safe && (!nonnegative || number >= 0);
    }
    private static string Text(JsonElement item, string key) => item.GetProperty(key).GetString() ?? "";
    private static bool Date(JsonElement item, string key) => item.GetProperty(key).ValueKind == JsonValueKind.String && DateOnly.TryParseExact(Text(item, key), "yyyy-MM-dd", out _);
    private static bool Month(JsonElement item, string key) => item.GetProperty(key).ValueKind == JsonValueKind.String && Text(item,key).Length == 7 && DateOnly.TryParseExact(Text(item,key)+"-01", "yyyy-MM-dd", out _);
    private static bool Flag(JsonElement item, string key) => item.GetProperty(key).ValueKind is JsonValueKind.True or JsonValueKind.False;
    private static JsonElement[] Rows(JsonElement item, string key) => item.GetProperty(key).EnumerateArray().ToArray();
    private static bool Unique(JsonElement[] rows, string key) => rows.All(r => !string.IsNullOrWhiteSpace(Text(r,key))) && rows.Select(r=>Text(r,key)).Distinct().Count() == rows.Length;
    private static long Number(JsonElement item, string key) => item.GetProperty(key).ValueKind == JsonValueKind.Null ? 0 : item.GetProperty(key).GetInt64();
    public static bool IsValid(JsonElement profile)
    {
        try
        {
            if (profile.ValueKind != JsonValueKind.Object || profile.GetProperty("version").GetInt32() != 2) return false;
            var daily = profile.GetProperty("daily");
            if (profile.TryGetProperty("cash", out _) && !Money(profile, "cash", true)) return false;
            if (profile.TryGetProperty("mortgageOffer", out _) && !Money(profile, "mortgageOffer", true)) return false;
            if (profile.TryGetProperty("possibleExpenses", out _))
            {
                var possible = Rows(profile, "possibleExpenses");
                if (!Unique(possible, "id") || possible.Any(r => string.IsNullOrWhiteSpace(Text(r, "concept")) || !Money(r, "amount", true) || Number(r, "amount") == 0)) return false;
            }
            var interest = profile.GetProperty("interest");
            var plan = profile.GetProperty("plan");
            var debt = profile.GetProperty("internalDebt");
            if (!Money(daily,"opening") || !Date(daily,"asOf") || !Money(interest,"opening",true) || !Date(interest,"asOf")
                || !Month(plan,"start") || !Month(plan,"horizon") || string.CompareOrdinal(Text(plan,"horizon"),Text(plan,"start")) < 0
                || !Money(plan,"saving",true) || !Money(plan,"investment",true) || !Money(plan,"repayment",true) || !Money(plan,"savingsTarget",true,true)) return false;
            var savings = Rows(profile,"savings");
            var investment = Rows(profile,"investment");
            foreach (var (rows, isInvestment) in new[] { (savings,false),(investment,true) })
            {
                if (!Unique(rows,"month")) return false;
                foreach (var row in rows)
                    if (!Month(row,"month") || !Money(row,"goal",true,true) || !Money(row,"actual",false,true)
                        || !Money(row,"repayment",true) || !Money(row,"withdrawal",true) || !Money(row,"approximation",true,true)
                        || isInvestment && (Number(row,"repayment") != 0 || Number(row,"withdrawal") != 0)) return false;
            }
            foreach (var key in new[] { "expenses", "incomes" })
            {
                var rows=Rows(daily,key);
                if (!Unique(rows,"id")) return false;
                foreach (var row in rows)
                    if (!Month(row,"month") || string.IsNullOrWhiteSpace(Text(row,"concept")) || !Money(row,"amount",true) || Number(row,"amount") == 0
                        || !new[] { "planned", "done" }.Contains(Text(row,"status")) || !Flag(row,"includedInOpening")
                        || row.GetProperty("includedInOpening").GetBoolean() && Text(row,"status") != "done") return false;
            }
            var interestRows=Rows(interest,"entries");
            if (!Unique(interestRows,"id") || interestRows.Any(r => !Date(r,"date") || string.CompareOrdinal(Text(r,"date"),Text(interest,"asOf")) < 0
                || string.IsNullOrWhiteSpace(Text(r,"concept")) || !Money(r,"amount"))) return false;
            var items = Rows(debt,"items");
            var payments = Rows(debt,"payments");
            var schedule = Rows(debt,"schedule");
            if (!Unique(items,"id") || !Unique(payments,"id") || !Unique(schedule,"month")) return false;
            foreach (var item in items)
                if (!Date(item,"date") || string.IsNullOrWhiteSpace(Text(item,"concept")) || !Money(item,"amount",true) || Number(item,"amount") == 0
                    || !new[] { "work", "interest" }.Contains(Text(item,"source")) || !Flag(item,"historical")) return false;
            var paidByItem = items.ToDictionary(i=>Text(i,"id"),_=>0m);
            var paidByMonth = new Dictionary<string,decimal>();
            foreach (var payment in payments)
            {
                if (!Date(payment,"date") || !Money(payment,"amount",true) || Number(payment,"amount") == 0 || !Flag(payment,"historical")) return false;
                decimal total=0;
                foreach (var allocation in Rows(payment,"allocations"))
                {
                    var id=Text(allocation,"item");
                    if (!paidByItem.ContainsKey(id) || !Money(allocation,"amount",true) || Number(allocation,"amount") == 0) return false;
                    paidByItem[id]+=Number(allocation,"amount");
                    total+=Number(allocation,"amount");
                }
                if (total != Number(payment,"amount")) return false;
                if (!payment.GetProperty("historical").GetBoolean())
                {
                    var month=Text(payment,"date")[..7];
                    paidByMonth[month]=paidByMonth.GetValueOrDefault(month)+total;
                }
            }
            if (items.Any(i => paidByItem[Text(i,"id")] > Number(i,"amount"))) return false;
            if (savings.Any(r=>Number(r,"repayment") != paidByMonth.GetValueOrDefault(Text(r,"month")))
                || paidByMonth.Keys.Any(m=>!savings.Any(r=>Text(r,"month")==m))) return false;
            var withdrawals=items.Where(i=>!i.GetProperty("historical").GetBoolean()).ToArray();
            if (savings.Any(r=>Number(r,"withdrawal") != withdrawals.Where(i=>Text(i,"source")=="work" && Text(i,"date").StartsWith(Text(r,"month"))).Sum(i=>(decimal)Number(i,"amount")))) return false;
            foreach(var item in withdrawals)
            {
                if(Text(item,"source")=="work" && !savings.Any(r=>Text(r,"month")==Text(item,"date")[..7]))return false;
                if(Text(item,"source")=="interest" && !interestRows.Any(r=>Text(r,"id")=="withdraw-"+Text(item,"id") && Number(r,"amount")==-Number(item,"amount") && Text(r,"date")==Text(item,"date")))return false;
            }
            if(interestRows.Any(r=>Number(r,"amount")<0 && !withdrawals.Any(i=>Text(i,"source")=="interest" && Text(r,"id")=="withdraw-"+Text(i,"id"))))return false;
            if (schedule.Any(r=>!Month(r,"month") || !Money(r,"amount",true))) return false;
            var commitments=Rows(profile,"commitments");
            if (!Unique(commitments,"id") || commitments.Any(r=>string.IsNullOrWhiteSpace(Text(r,"name")) || !Money(r,"amount",true,true))) return false;
            var work=savings.Sum(r=>(decimal)Number(r,"actual")+Number(r,"repayment")-Number(r,"withdrawal"));
            var earned=Number(interest,"opening")+interestRows.Sum(r=>(decimal)Number(r,"amount"));
            var invested=investment.Sum(r=>(decimal)Number(r,"actual"));
            if (new[] {work,earned,invested,work+earned,work+earned+invested}.Any(n=>n<0 || n>Safe)) return false;
            return true;
        }
        catch (Exception exception) when (exception is InvalidOperationException or KeyNotFoundException or FormatException or OverflowException or ArgumentException) { return false; }
    }
}
