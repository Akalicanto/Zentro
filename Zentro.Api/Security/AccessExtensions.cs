using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using System.Threading.RateLimiting;

namespace Zentro.Api.Security;

public static class AccessExtensions
{
    public static IServiceCollection AddSingleUserAccess(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddSingleton<SingleUserAccess>();
        var database = Path.GetFullPath(configuration["Zentro:DatabasePath"] ?? "Data/zentro.db", environment.ContentRootPath);
        var protection = services.AddDataProtection().SetApplicationName("Zentro");
        if (!environment.IsDevelopment() || !string.IsNullOrEmpty(configuration["Zentro:Authentication:PasswordHash"]))
        {
            protection.PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(Path.GetDirectoryName(database)!, "keys")));
        }

        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
        {
            options.Cookie.Name = "__Host-Zentro";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.Path = "/";
            options.ExpireTimeSpan = TimeSpan.FromHours(12);
            options.SlidingExpiration = false;
            options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
            options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
            options.Events.OnValidatePrincipal = context =>
            {
                var access = context.HttpContext.RequestServices.GetRequiredService<SingleUserAccess>();
                if (context.Principal?.FindFirstValue("zentro-stamp") != access.Stamp)
                {
                    context.RejectPrincipal();
                }

                return Task.CompletedTask;
            };
        });
        services.AddAuthorization();
        services.Configure<ForwardedHeadersOptions>(options => options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = 429;
            options.AddFixedWindowLimiter("login", limiter =>
            {
                limiter.PermitLimit = 5;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueLimit = 0;
                limiter.AutoReplenishment = true;
            });
        });
        return services;
    }

    public static WebApplication UseSingleUserAccess(this WebApplication app)
    {
        var access = app.Services.GetRequiredService<SingleUserAccess>();
        app.UseForwardedHeaders();
        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
        }

        app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["Referrer-Policy"] = "no-referrer";
            if (!app.Environment.IsDevelopment())
            {
                context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
            }

            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.Headers.CacheControl = "no-store";
                context.Response.Headers["X-Zentro-Authentication"] = access.Enabled ? "required" : "local";
            }
            await next();
        });
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();
        app.Use(async (context, next) =>
        {
            var path = context.Request.Path;
            if (access.Enabled && path.StartsWithSegments("/api") && path != "/api/auth/login" && path != "/api/health" && context.User.Identity?.IsAuthenticated != true)
            { context.Response.StatusCode = 401; return; }
            if (access.Enabled && path.StartsWithSegments("/api") && context.Request.Method is "POST" or "PUT" or "DELETE" && context.Request.Headers["X-Zentro-Client"] != "web")
            { context.Response.StatusCode = 400; return; }
            await next();
        });
        app.MapPost("/api/auth/login", async (LoginRequest request, HttpContext context) =>
        {
            if (!access.Enabled)
            {
                return Results.NotFound();
            }

            if (request.Password is null || request.Code is null || !access.Verify(request.Password, request.Code))
            {
                return Results.Unauthorized();
            }

            var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "owner"), new Claim("zentro-stamp", access.Stamp)], CookieAuthenticationDefaults.AuthenticationScheme);
            await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = false });
            return Results.NoContent();
        }).RequireRateLimiting("login");
        app.MapPost("/api/auth/logout", async (HttpContext context) => { await context.SignOutAsync(); return Results.NoContent(); });
        return app;
    }

    public sealed record LoginRequest(string? Password, string? Code);
}
