using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Zentro.Api.Models;
using Zentro.Api.Services;

namespace Zentro.Api.Controllers;

[ApiController]
[Route("api/state")]
public sealed class StateController(IProfileService profiles) : ControllerBase
{
    /// <summary>Lee el perfil completo; devuelve 204 si no hay datos.</summary>
    [HttpGet(Name = "GetState")]
    [ProducesResponseType(typeof(FinancialProfile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Read()
    {
        var document = profiles.Read();
        return document is null ? NoContent() : Ok(document);
    }
    /// <summary>Valida el perfil y guarda todas sus colecciones en una transacción.</summary>
    [HttpPut(Name = "SaveState")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public IActionResult Save([FromBody] JsonElement document)
    {
        var validation = profiles.Save(document);
        if (validation.IsValid)
        {
            return NoContent();
        }

        return ValidationProblem(new ValidationProblemDetails(validation.Errors));
    }
}
