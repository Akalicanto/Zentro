using System.Text.Json.Serialization;

namespace Zentro.Api.Models;

public sealed record DailyMovement
{
    [JsonRequired]
    public string Id { get; init; } = null!;

    // Reconoce el campo de clientes antiguos; no se lee, devuelve ni persiste.
    [JsonIgnore]
    public string? Month { get; init; }

    [JsonRequired]
    public string Concept { get; init; } = null!;

    [JsonRequired]
    public long Amount { get; init; }

    [JsonRequired]
    public string Status { get; init; } = null!;

    [JsonRequired]
    public bool IncludedInOpening { get; init; }
}
