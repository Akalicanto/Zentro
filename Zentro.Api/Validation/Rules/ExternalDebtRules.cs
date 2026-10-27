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
            (debt.DueDay is null or >= 1 and <= 31) &&
            Unique(debt.Installments, row => row.Month) && debt.Installments.All(ValidInstallment) &&
            (debt.Advances is null || Unique(debt.Advances, row => row.Id) && debt.Advances.All(row => Date(row.Date) && Money(row.Amount, true) && row.Amount > 0 && row.Strategy is "term" or "payment")) &&
            debt.Installments.Sum(row => (decimal)row.Amount) + (debt.Advances ?? []).Sum(row => (decimal)row.Amount) <= debt.Total &&
            (debt.CreatedOn is null || Date(debt.CreatedOn)) &&
            (debt.ArchivedOn is null || Date(debt.ArchivedOn)) &&
            (debt.CompletedOn is null || Date(debt.CompletedOn) && debt.Installments.Sum(row => (decimal)row.Paid) + (debt.Advances ?? []).Sum(row => (decimal)row.Amount) == debt.Total) &&
            (debt.Notes is null || debt.Notes.Length <= 2000) &&
            (debt.Activity is null || Unique(debt.Activity, row => row.Id) && debt.Activity.All(row => Date(row.Date) && NotEmpty(row.Description) && row.Description.Length <= 1000)));
    }
    private static bool ValidInstallment(DebtInstallment row) =>
        Month(row.Month) && Money(row.Amount, true) && row.Amount > 0 &&
        (row.Status is "paid" or "reserved" or "pending") &&
        Money(row.Paid, true) && Money(row.Reserved, true) &&
        (decimal)row.Paid + row.Reserved <= row.Amount &&
        row.Status == (row.Paid == row.Amount ? "paid" : row.Reserved > 0 ? "reserved" : "pending");
}
