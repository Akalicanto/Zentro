using System.Text.Json;
using System.Text.Json.Serialization;
using Zentro.Api.Models;
using Zentro.Api.Validation.Rules;
using static Zentro.Api.Validation.Rules.FinancialValueRules;

namespace Zentro.Api.Validation;

/// <summary>Checks the document contract, each collection and the balances shared by collections.</summary>
public sealed class ProfileValidator : IProfileValidator
{
    private static readonly string[] OptionalFields =
        ["cash", "mortgageOffer", "debts", "savingsPlacements", "possibleExpenses"];

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        NumberHandling = JsonNumberHandling.Strict,
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    public ProfileValidationResult Validate(JsonElement document)
    {
        FinancialProfile? profile;
        try
        {
            // Older clients may omit optional fields; explicit null is not valid for them.
            if (document.ValueKind != JsonValueKind.Object || OptionalFields.Any(field =>
                document.TryGetProperty(field, out var value) && value.ValueKind == JsonValueKind.Null))
            {
                return ProfileValidationResult.Invalid("state", "Se requiere un perfil Zentro v2 válido.");
            }

            profile = document.Deserialize<FinancialProfile>(JsonOptions);
            if (document.TryGetProperty("savingsPlacements", out var placements) && placements.EnumerateArray().Any(row =>
                row.ValueKind != JsonValueKind.Object ||
                row.TryGetProperty("dayCount", out var value) && value.ValueKind == JsonValueKind.Null))
            {
                return ProfileValidationResult.Invalid("savingsPlacements", "El método de cálculo debe omitirse o tener un valor válido.");
            }
        }
        catch (JsonException)
        {
            return ProfileValidationResult.Invalid("state", "El documento contiene campos ausentes o tipos incorrectos.");
        }

        if (profile is null || profile.Version != 2)
        {
            return ProfileValidationResult.Invalid("version", "Se requiere la versión 2 del perfil.");
        }

        var errors = new Dictionary<string, string[]>();
        void Check(bool valid, string field, string message)
        {
            if (!valid)
            {
                errors[field] = [message];
            }
        }

        Check(OptionalMoney(profile.Cash, true), "cash", "Revisa el efectivo.");
        Check(OptionalMoney(profile.MortgageOffer, true), "mortgageOffer", "Revisa la oferta hipotecaria.");
        Check(DailyBudgetRules.IsValid(profile.Daily), "daily", "Revisa el saldo, las fechas y los movimientos diarios.");
        Check(ContributionRules.IsValid(profile.Savings), "savings", "Revisa los meses, importes y objetivos de ahorro.");
        Check(ContributionRules.IsValid(profile.Investment, true), "investment", "Revisa los meses e importes de inversión.");
        Check(InterestRules.IsValid(profile.Interest), "interest", "Revisa el saldo y las anotaciones de intereses.");
        Check(FinancialPlanRules.IsValid(profile.Plan), "plan", "Revisa el plan mensual.");
        Check(SavingsPlacementRules.IsValid(profile.SavingsPlacements), "savingsPlacements", "Revisa los destinos, tipos de interés y plazos.");
        Check(ExternalDebtRules.IsValid(profile.Debts), "debts", "Revisa las deudas y sus cuotas.");
        Check(profile.PossibleExpenses is null ||
            Unique(profile.PossibleExpenses, row => row.Id) && profile.PossibleExpenses.All(row =>
                NotEmpty(row.Concept) && Money(row.Amount, true) && row.Amount > 0),
            "possibleExpenses", "Revisa los posibles gastos.");
        Check(Unique(profile.Commitments, row => row.Id) && profile.Commitments.All(row =>
            NotEmpty(row.Name) && OptionalMoney(row.Amount, true)),
            "commitments", "Revisa los compromisos.");

        // Cross-collection rules require valid amounts, dates and non-null collections first.
        if (errors.Count > 0)
        {
            return new(errors);
        }

        Check(InternalDebtRules.IsValid(profile.InternalDebt, profile.Savings, profile.Interest.Entries),
            "internalDebt", "Las retiradas, reposiciones y sus registros deben cuadrar.");

        var work = profile.Savings.Sum(row => (decimal)(row.Actual ?? 0) + row.Repayment - row.Withdrawal);
        var interest = profile.Interest.Opening + profile.Interest.Entries.Sum(row => (decimal)row.Amount);
        var invested = profile.Investment.Sum(row => (decimal)(row.Actual ?? 0));
        var balances = new[] { work, interest, invested, work + interest, work + interest + invested };
        Check(balances.All(value => value >= 0 && value <= MaximumSafeInteger),
            "totals", "Los saldos deben ser no negativos y representables de forma segura.");

        return new(errors, errors.Count == 0 ? profile : null);
    }
}
