using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record DailyBudget
{
    [JsonRequired]
    public long Opening { get; init; }

    [JsonRequired]
    public string AsOf { get; init; } = null!;

    [JsonRequired]
    public List<DailyMovement> Expenses { get; init; } = null!;

    [JsonRequired]
    public List<DailyMovement> Incomes { get; init; } = null!;
}
