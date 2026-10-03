using Zentro.Api.Infrastructure.Persistence;
using Zentro.Api.Services;
using Zentro.Api.Validation;

namespace Zentro.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddZentro(this IServiceCollection services)
    {
        services.AddSingleton<SqliteConnectionFactory>();
        services.AddSingleton<SqliteSchema>();
        services.AddSingleton<IProfileValidator, ProfileValidator>();
        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IProfileService, ProfileService>();
        return services;
    }
}
