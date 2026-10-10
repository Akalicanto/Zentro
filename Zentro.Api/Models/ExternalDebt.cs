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

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CreatedOn { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CompletedOn { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ArchivedOn { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Notes { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<DebtActivity>? Activity { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<DebtAdvance>? Advances { get; init; }
}
