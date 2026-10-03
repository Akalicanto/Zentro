using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class ExternalDebtRules
{
    public static bool IsValid(List<ExternalDebt>? debts)
    {
        if (debts is null)
        {
            return true;
        }

        return Unique(debts, debt => debt.Id) && debts.All(debt => NotEmpty(debt.Name) && Money(debt.Total, true) &&
            Unique(debt.Installments, row => row.Month) && debt.Installments.All(row =>
                Month(row.Month) && Money(row.Amount, true) && row.Amount > 0 && row.Status is "paid" or "reserved" or "pending") &&
            debt.Installments.Sum(row => (decimal)row.Amount) <= debt.Total);
    }
}
