using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record DebtAllocation
{
    [JsonRequired]
    public string Item { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }
}
