using Zentro.Api.Models;
using System.Text.Json;
using Zentro.Api.Infrastructure.Persistence;
using Zentro.Api.Validation;

namespace Zentro.Api.Services;

public sealed class ProfileService(IProfileRepository repository, IProfileValidator validator) : IProfileService
{
    public FinancialProfile? Read() => repository.Read();
    public bool IsHealthy() => repository.IsHealthy();
    public ProfileValidationResult Save(JsonElement document)
    {
        var validation = validator.Validate(document);
        if (validation.IsValid)
        {
            repository.Write(validation.Profile!);
        }

        return validation;
    }
}
