using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record Commitment
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Name { get; init; } = null!;

    [JsonRequired]
    public long? Amount { get; init; }
}
