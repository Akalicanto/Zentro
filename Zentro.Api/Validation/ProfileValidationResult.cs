namespace Zentro.Api.Validation;

public sealed record ProfileValidationResult(Dictionary<string, string[]> Errors)
{
    public bool IsValid => Errors.Count == 0;
    public static ProfileValidationResult Invalid(string field, string message) => new(new Dictionary<string, string[]> { [field] = [message] });
}
