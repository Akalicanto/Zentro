using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record DailyMovement
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Month { get; init; } = null!;

    [JsonRequired]
    public string Concept { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }

    [JsonRequired]
    public string Status { get; init; } = null!;

    [JsonRequired]
    public bool IncludedInOpening { get; init; }
}
