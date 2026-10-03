using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class InternalDebtRules
{
    public static bool IsValid(
        InternalDebt? debt,
        List<MonthlyContribution> savings,
        List<InterestEntry> interest)
    {
        if (debt is null ||
            !Unique(debt.Items, row => row.Id) ||
            !Unique(debt.Payments, row => row.Id) ||
            !Unique(debt.Schedule, row => row.Month))
        {
            return false;
        }

        if (debt.Items.Any(row =>
            !Date(row.Date) || !NotEmpty(row.Concept) || !Money(row.Amount, true) ||
            row.Amount == 0 || row.Source is not ("work" or "interest")))
        {
            return false;
        }

        if (debt.Schedule.Any(row => !Month(row.Month) || !Money(row.Amount, true)))
        {
            return false;
        }

        var paidByItem = debt.Items.ToDictionary(item => item.Id, _ => 0m);
        var paidByMonth = new Dictionary<string, decimal>();
        foreach (var payment in debt.Payments)
        {
            if (!Date(payment.Date) || !Money(payment.Amount, true) ||
                payment.Amount == 0 || payment.Allocations is null)
            {
                return false;
            }

            decimal total = 0;
            foreach (var allocation in payment.Allocations)
            {
                if (allocation is null || !NotEmpty(allocation.Item) ||
                    !paidByItem.ContainsKey(allocation.Item) ||
                    !Money(allocation.Amount, true) || allocation.Amount == 0)
                {
                    return false;
                }

                paidByItem[allocation.Item] += allocation.Amount;
                total += allocation.Amount;
            }

            if (total != payment.Amount)
            {
                return false;
            }

            // Historical payments are already included in the saved monthly contribution.
            if (!payment.Historical)
            {
                var month = payment.Date[..7];
                paidByMonth[month] = paidByMonth.GetValueOrDefault(month) + total;
            }
        }

        if (debt.Items.Any(item => paidByItem[item.Id] > item.Amount))
        {
            return false;
        }

        if (savings.Any(row => row.Repayment != paidByMonth.GetValueOrDefault(row.Month)) ||
            paidByMonth.Keys.Any(month => !savings.Any(row => row.Month == month)))
        {
            return false;
        }

        var withdrawals = debt.Items.Where(item => !item.Historical).ToArray();
        var workWithdrawalsByMonth = withdrawals
            .Where(item => item.Source == "work")
            .GroupBy(item => item.Date[..7])
            .ToDictionary(group => group.Key, group => group.Sum(item => (decimal)item.Amount));

        if (savings.Any(row => row.Withdrawal != workWithdrawalsByMonth.GetValueOrDefault(row.Month)))
        {
            return false;
        }

        foreach (var item in withdrawals)
        {
            if (item.Source == "work" && !savings.Any(row => row.Month == item.Date[..7]))
            {
                return false;
            }

            if (item.Source == "interest" && !interest.Any(row =>
                row.Id == "withdraw-" + item.Id && row.Amount == -item.Amount && row.Date == item.Date))
            {
                return false;
            }
        }

        return !interest.Any(row => row.Amount < 0 &&
            !withdrawals.Any(item => item.Source == "interest" && row.Id == "withdraw-" + item.Id));
    }
}
