using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record ExternalDebt
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    [JsonRequired]
    public string Name { get; init; } = null!;

    [JsonRequired]
    public long Total { get; init; }

    [JsonRequired]
    public List<DebtInstallment> Installments { get; init; } = null!;
}
