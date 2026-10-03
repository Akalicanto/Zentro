using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

/// <summary>A null amount assigns the remaining savings automatically to one remunerated account.</summary>
public sealed record SavingsPlacement
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Name { get; init; } = null!;

    [JsonRequired]
    public string Kind { get; init; } = null!;

    [JsonRequired]
    public long? Amount { get; init; }

    [JsonRequired]
    public int AnnualRateBps { get; init; }

    [JsonRequired]
    public string RateType { get; init; } = null!;

    public string? DayCount { get; init; }

    [JsonRequired]
    public int WithholdingBps { get; init; }

    [JsonRequired]
    public string? Start { get; init; }

    [JsonRequired]
    public int? Months { get; init; }
}
