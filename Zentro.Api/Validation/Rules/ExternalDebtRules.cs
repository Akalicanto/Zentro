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
            debt.Installments.Sum(row => (decimal)row.Amount) <= debt.Total &&
            (debt.CreatedOn is null || Date(debt.CreatedOn)) &&
            (debt.ArchivedOn is null || Date(debt.ArchivedOn)) &&
            (debt.CompletedOn is null || Date(debt.CompletedOn) && debt.Installments.Where(row => row.Status == "paid").Sum(row => (decimal)row.Amount) == debt.Total) &&
            (debt.Notes is null || debt.Notes.Length <= 2000) &&
            (debt.Activity is null || Unique(debt.Activity, row => row.Id) && debt.Activity.All(row => Date(row.Date) && NotEmpty(row.Description) && row.Description.Length <= 1000)));
    }
}
