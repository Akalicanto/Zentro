using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Zentro.Api.Models;
using Zentro.Api.Services;
using Zentro.Api.Infrastructure.Persistence;
using Zentro.Api.Security;

namespace Zentro.Api.Controllers;

[ApiController]
[Route("api/state")]
public sealed class StateController(IProfileService profiles, SingleUserAccess access) : ControllerBase
{
    /// <summary>Lee el perfil completo; devuelve 204 si no hay datos.</summary>
    [HttpGet(Name = "GetState")]
    [ProducesResponseType(typeof(FinancialProfile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Read()
    {
        var document = profiles.Read();
        Response.Headers.ETag = ProfileVersion.For(document);
        return document is null ? NoContent() : Ok(document);
    }
    /// <summary>Valida el perfil y guarda todas sus colecciones en una transacción.</summary>
    [HttpPut(Name = "SaveState")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public IActionResult Save([FromBody] JsonElement document)
    {
        var expected = Request.Headers.IfMatch.ToString();
        if (access.Enabled && string.IsNullOrEmpty(expected))
        {
            return StatusCode(428, new { message = "Recarga los datos antes de guardar." });
        }

        var result = profiles.Save(document, string.IsNullOrEmpty(expected) ? null : expected);
        var validation = result.Validation;
        if (validation.IsValid && result.Version is null)
        {
            return StatusCode(412, new { message = "Los datos han cambiado en otro dispositivo. No se ha sobrescrito el servidor." });
        }

        if (validation.IsValid)
        {
            Response.Headers.ETag = result.Version;
            return NoContent();
        }

        return ValidationProblem(new ValidationProblemDetails(validation.Errors));
    }
}
