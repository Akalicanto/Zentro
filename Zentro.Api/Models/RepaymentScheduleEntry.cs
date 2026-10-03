using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record RepaymentScheduleEntry
{
    [JsonRequired]
    public string Month { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }
}
