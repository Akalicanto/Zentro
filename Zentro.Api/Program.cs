using System.Text.Json;
using Zentro.Api.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<StateRepository>();
builder.Services.AddProblemDetails();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 5 * 1024 * 1024);
var app = builder.Build();
app.UseExceptionHandler();
app.Services.GetRequiredService<StateRepository>().Initialize();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.DocumentTitle = "Zentro API");
}
app.MapGet("/api/health", (StateRepository repository) =>
    Results.Ok(new { status = repository.IsHealthy() ? "ok" : "error", database = "SQLite" }))
    .WithName("Health").WithSummary("Comprueba la API y SQLite");
app.MapGet("/api/state", (StateRepository repository) =>
{
    var json = repository.Read();
    return json is null ? Results.NoContent() : Results.Content(json, "application/json");
}).WithName("GetState").WithSummary("Lee Zentro; 204 si todavía no hay datos")
    .Produces(200, contentType: "application/json").Produces(204);
app.MapPut("/api/state", (JsonElement state, StateRepository repository) =>
{
    if (!StateValidator.IsValid(state))
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["state"] = ["Se requiere un documento Zentro v1 con demo, accounts, debts, entries, goals y categories válidos."]
        });
    repository.Write(state.GetRawText());
    return Results.NoContent();
}).WithName("SaveState").WithSummary("Guarda el documento completo en SQLite de forma atómica")
    .Produces(204).ProducesValidationProblem();
app.Run();
