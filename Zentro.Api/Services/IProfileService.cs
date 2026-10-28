using Zentro.Api.Models;
using System.Text.Json;
using Zentro.Api.Validation;

namespace Zentro.Api.Services;

public interface IProfileService
{
    FinancialProfile? Read();
    ProfileSaveResult Save(JsonElement document, string? expectedVersion = null);
    bool IsHealthy();
}
