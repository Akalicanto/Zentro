using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record DebtActivity
{
    [JsonRequired] public string Id { get; init; } = null!;
    [JsonRequired] public string Date { get; init; } = null!;
    [JsonRequired] public string Description { get; init; } = null!;
}
