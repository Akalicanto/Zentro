using Zentro.Api.Models;
using System.Text.Json;
using Zentro.Api.Validation;

namespace Zentro.Api.Services;

public interface IProfileService
{
    FinancialProfile? Read();
    ProfileValidationResult Save(JsonElement document);
    bool IsHealthy();
}
