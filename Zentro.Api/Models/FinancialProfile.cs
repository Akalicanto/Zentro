using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

/// <summary>The persisted v2 contract. Money is stored in cents; interest rates are basis points.</summary>
public sealed record FinancialProfile
{
    [JsonRequired]
    public int Version { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? Cash { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? MortgageOffer { get; init; }

    public List<ExternalDebt>? Debts { get; init; }

    public List<SavingsPlacement>? SavingsPlacements { get; init; }

    public List<PossibleExpense>? PossibleExpenses { get; init; }

    [JsonRequired]
    public DailyBudget Daily { get; init; } = null!;

    [JsonRequired]
    public List<MonthlyContribution> Savings { get; init; } = null!;

    [JsonRequired]
    public List<MonthlyContribution> Investment { get; init; } = null!;

    [JsonRequired]
    public InterestAccount Interest { get; init; } = null!;

    [JsonRequired]
    public InternalDebt InternalDebt { get; init; } = null!;

    [JsonRequired]
    public FinancialPlan Plan { get; init; } = null!;

    [JsonRequired]
    public List<Commitment> Commitments { get; init; } = null!;
}
