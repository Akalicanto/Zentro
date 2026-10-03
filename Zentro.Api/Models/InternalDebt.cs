using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record InternalDebt
{
    [JsonRequired]
    public List<InternalDebtItem> Items { get; init; } = null!;

    [JsonRequired]
    public List<InternalDebtPayment> Payments { get; init; } = null!;

    [JsonRequired]
    public List<RepaymentScheduleEntry> Schedule { get; init; } = null!;
}
