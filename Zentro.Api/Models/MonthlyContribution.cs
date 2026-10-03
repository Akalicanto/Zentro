using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

/// <summary>Null means unrecorded. Zero and negative contributions are meaningful values.</summary>
public sealed record MonthlyContribution
{
    [JsonRequired]
    public string Month { get; init; } = null!;

    [JsonRequired]
    public long? Goal { get; init; }

    [JsonRequired]
    public long? Actual { get; init; }

    [JsonRequired]
    public long Repayment { get; init; }

    [JsonRequired]
    public long Withdrawal { get; init; }

    [JsonRequired]
    public long? Approximation { get; init; }
}
