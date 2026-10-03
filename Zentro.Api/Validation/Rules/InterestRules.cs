using Zentro.Api.Models;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation.Rules;

internal static class InterestRules
{
    public static bool IsValid(InterestAccount? interest) => interest is not null && Money(interest.Opening, true) && Date(interest.AsOf) &&
        Unique(interest.Entries, row => row.Id) && interest.Entries.All(row =>
            Date(row.Date) && string.CompareOrdinal(row.Date, interest.AsOf) >= 0 && NotEmpty(row.Concept) && Money(row.Amount));
}
