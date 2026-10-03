using Zentro.Api.Extensions;
using Zentro.Api.Infrastructure.Persistence;
using Zentro.Api.OpenApi;
var builder = WebApplication.CreateBuilder(args);
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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.DocumentTitle = "Zentro API");
}
app.MapControllers();
app.Run();
