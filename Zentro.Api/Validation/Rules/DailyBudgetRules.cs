using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class DailyBudgetRules
{
    public static bool IsValid(DailyBudget? budget)
    {
        if (budget is null || !Money(budget.Opening) || !Date(budget.AsOf))
        {
            return false;
        }

        return new[] { budget.Expenses, budget.Incomes }.All(rows => Unique(rows, row => row.Id) && rows.All(row =>
            Month(row.Month) && NotEmpty(row.Concept) && Money(row.Amount, true) && row.Amount > 0 &&
            row.Status is "planned" or "done" && (!row.IncludedInOpening || row.Status == "done")));
    }
}
