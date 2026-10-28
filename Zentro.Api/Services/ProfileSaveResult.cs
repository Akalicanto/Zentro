using Zentro.Api.Validation;

namespace Zentro.Api.Services;

public sealed record ProfileSaveResult(ProfileValidationResult Validation, string? Version);
