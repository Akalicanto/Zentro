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
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? PaidAmount { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? ReservedAmount { get; init; }

    [JsonIgnore]
    public long Paid => PaidAmount ?? (Status == "paid" ? Amount : 0);
    [JsonIgnore]
    public long Reserved => ReservedAmount ?? (Status == "reserved" ? Amount : 0);
}
