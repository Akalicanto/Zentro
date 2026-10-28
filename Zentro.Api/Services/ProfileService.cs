using Zentro.Api.Models;
using System.Text.Json;
using Zentro.Api.Infrastructure.Persistence;
using Zentro.Api.Validation;

namespace Zentro.Api.Services;

public sealed class ProfileService(IProfileRepository repository, IProfileValidator validator) : IProfileService
{
    public FinancialProfile? Read() => repository.Read();
    public bool IsHealthy() => repository.IsHealthy();
    public ProfileSaveResult Save(JsonElement document, string? expectedVersion = null)
    {
        var validation = validator.Validate(document);
        var version = validation.IsValid ? repository.WriteIfCurrent(validation.Profile!, expectedVersion) : null;
        return new(validation, version);
    }
}
