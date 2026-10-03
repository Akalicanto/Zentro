using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record InterestAccount
{
    [JsonRequired]
    public long Opening { get; init; }

    [JsonRequired]
    public string AsOf { get; init; } = null!;

    [JsonRequired]
    public List<InterestEntry> Entries { get; init; } = null!;
}
