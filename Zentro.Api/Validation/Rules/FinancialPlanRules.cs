using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class FinancialPlanRules
{
    public static bool IsValid(FinancialPlan? plan) => plan is not null && Month(plan.Start) && Month(plan.Horizon) &&
        string.CompareOrdinal(plan.Horizon, plan.Start) >= 0 && Money(plan.Saving, true) && Money(plan.Investment, true) &&
        Money(plan.Repayment, true) && OptionalMoney(plan.SavingsTarget, true);
}
