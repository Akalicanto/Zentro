using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

/// <summary>Allocations connect each repayment to the withdrawals it settles.</summary>
public sealed record InternalDebtPayment
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Date { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }

    [JsonRequired]
    public bool Historical { get; init; }

    [JsonRequired]
    public List<DebtAllocation> Allocations { get; init; } = null!;
}
