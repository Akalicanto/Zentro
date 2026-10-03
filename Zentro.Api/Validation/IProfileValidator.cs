using System.Text.Json;

namespace Zentro.Api.Validation;

public interface IProfileValidator
{
    ProfileValidationResult Validate(JsonElement document);
}
