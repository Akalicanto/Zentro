using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record PossibleExpense
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Concept { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }
}
