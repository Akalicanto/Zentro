using Microsoft.AspNetCore.Mvc;
using Zentro.Api.Services;

namespace Zentro.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController(IProfileService profiles) : ControllerBase
{
    /// <summary>Comprueba la conexión con SQLite.</summary>
    [HttpGet(Name = "Health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Read() => Ok(new { status = profiles.IsHealthy() ? "ok" : "error", database = "SQLite" });
}
