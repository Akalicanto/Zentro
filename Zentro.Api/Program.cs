using Zentro.Api.Extensions;
using Zentro.Api.Infrastructure.Persistence;
using Zentro.Api.OpenApi;
var webRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = Directory.Exists(webRoot) ? webRoot : null
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.OperationFilter<ProfileDocumentOperationFilter>();
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "Zentro.Api.xml"));
});
builder.Services.AddProblemDetails();
builder.Services.AddZentro();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 5 * 1024 * 1024);
var app = builder.Build();
app.UseExceptionHandler();
app.Services.GetRequiredService<SqliteSchema>().Initialize();
if (Directory.Exists(webRoot))
{
    app.UseDefaultFiles();
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = context =>
        {
            if (context.File.Name is "sw.js" or "index.html" or "manifest.webmanifest")
            {
                context.Context.Response.Headers.CacheControl = "no-cache";
            }
        }
    });
}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.DocumentTitle = "Zentro API");
}
app.MapControllers();
app.Run();
