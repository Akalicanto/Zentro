using System.Text.Json;
using Zentro.Api.Validation;

namespace Zentro.Api.Services;

public interface IProfileService
{
    string? Read();
    ProfileValidationResult Save(JsonElement document);
    bool IsHealthy();
}
