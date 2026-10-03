using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class SavingsPlacementRules
{
    public static bool IsValid(List<SavingsPlacement>? rows)
    {
        if (rows is null)
        {
            return true;
        }

        if (!Unique(rows, row => row.Id) || rows.Count(row => row.Amount is null) > 1)
        {
            return false;
        }

        return rows.All(row => NotEmpty(row.Name) && row.Kind is "deposit" or "remunerated" &&
            OptionalMoney(row.Amount, true) && row.AnnualRateBps is >= 0 and <= 10000 && row.WithholdingBps is >= 0 and <= 10000 &&
            row.RateType is "tin" or "tae" && (row.DayCount is null or "monthly" or "actual360") &&
            (row.DayCount != "actual360" || row.Kind == "remunerated" && row.RateType == "tin") &&
            (row.Kind == "deposit" ? row.Amount.HasValue && Date(row.Start) && row.Months is > 0 and <= 600 : row.Start is null && row.Months is null));
    }
}
