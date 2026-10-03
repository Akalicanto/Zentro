using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record DebtInstallment
{
    [JsonRequired]
    public string Month { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }

    [JsonRequired]
    public string Status { get; init; } = null!;
}
