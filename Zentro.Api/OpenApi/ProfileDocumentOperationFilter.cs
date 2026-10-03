using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Zentro.Api.Controllers;
using Zentro.Api.Models;

namespace Zentro.Api.OpenApi;

/// <summary>Documents the typed contract while accepting raw JSON to preserve existing optional fields.</summary>
public sealed class ProfileDocumentOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (context.MethodInfo.DeclaringType != typeof(StateController) || context.MethodInfo.Name != nameof(StateController.Save))
        {
            return;
        }

        var schema = context.SchemaGenerator.GenerateSchema(typeof(FinancialProfile), context.SchemaRepository);
        foreach (var content in operation.RequestBody!.Content!.Values)
        {
            content.Schema = schema;
        }
    }
}
