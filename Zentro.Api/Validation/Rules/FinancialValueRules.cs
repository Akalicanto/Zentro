using System.Globalization;

namespace Zentro.Api.Validation.Rules;

internal static class FinancialValueRules
{
    public const decimal MaximumSafeInteger = 9_007_199_254_740_991;
    public static bool Money(long value, bool nonnegative = false) => Math.Abs((decimal)value) <= MaximumSafeInteger && (!nonnegative || value >= 0);
    public static bool OptionalMoney(long? value, bool nonnegative = false) => !value.HasValue || Money(value.Value, nonnegative);
    public static bool NotEmpty(string? value) => !string.IsNullOrWhiteSpace(value);
    public static bool Date(string? value) => DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
    public static bool Month(string? value) => value is { Length: 7 } && value[0] is >= '1' and <= '9' && Date(value + "-01");
    public static int MonthIndex(string value) => int.Parse(value[..4], CultureInfo.InvariantCulture) * 12 + int.Parse(value[5..], CultureInfo.InvariantCulture);
    public static bool Unique<T>(IReadOnlyCollection<T>? rows, Func<T, string?> key) where T : class =>
        rows is not null && rows.All(row => row is not null && NotEmpty(key(row))) && rows.Select(key).Distinct().Count() == rows.Count;
}
