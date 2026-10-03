using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class ContributionRules
{
    public static bool IsValid(List<MonthlyContribution>? rows, bool investment = false) =>
        Unique(rows, row => row.Month) && rows!.All(row =>
            Month(row.Month) && OptionalMoney(row.Goal, true) && OptionalMoney(row.Actual) &&
            Money(row.Repayment, true) && Money(row.Withdrawal, true) && OptionalMoney(row.Approximation, true) &&
            (!investment || row.Repayment == 0 && row.Withdrawal == 0));
}
