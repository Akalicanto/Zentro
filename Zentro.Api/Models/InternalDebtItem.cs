using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

/// <summary>Historical withdrawals are already included in the imported savings balance.</summary>
public sealed record InternalDebtItem
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Date { get; init; } = null!;

    [JsonRequired]
    public string Concept { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }

    [JsonRequired]
    public string Source { get; init; } = null!;

    [JsonRequired]
    public bool Historical { get; init; }
}
