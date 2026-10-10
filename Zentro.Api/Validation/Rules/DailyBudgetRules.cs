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

        if (!new[] { budget.Expenses, budget.Incomes }.All(rows => Unique(rows, row => row.Id) && rows.All(row =>
            NotEmpty(row.Concept) && Money(row.Amount, true) && row.Amount > 0 &&
            row.Status is "planned" or "done" && (!row.IncludedInOpening || row.Status == "done"))))
        {
            return false;
        }

        static decimal Total(List<DailyMovement> rows, string status, bool realized = false) =>
            rows.Where(row => row.Status == status && (!realized || !row.IncludedInOpening)).Sum(row => (decimal)row.Amount);
        var expenses = Total(budget.Expenses, "planned");
        var incomes = Total(budget.Incomes, "planned");
        var current = budget.Opening + Total(budget.Incomes, "done", true) - Total(budget.Expenses, "done", true);
        return new[] { expenses, incomes, current, current - expenses + incomes }.All(value => Math.Abs(value) <= MaximumSafeInteger);
    }
}
