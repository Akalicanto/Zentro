using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record FinancialPlan
{
    [JsonRequired]
    public string Start { get; init; } = null!;

    [JsonRequired]
    public long Saving { get; init; }

    [JsonRequired]
    public long Investment { get; init; }

    [JsonRequired]
    public long Repayment { get; init; }

    [JsonRequired]
    public string Horizon { get; init; } = null!;

    [JsonRequired]
    public long? SavingsTarget { get; init; }
}
