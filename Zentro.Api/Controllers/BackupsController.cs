using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Zentro.Api.Controllers;

/// <summary>Control local de copias por correo. No abre servicios ni puertos adicionales.</summary>
[ApiController]
[Route("api/backups")]
public sealed class BackupsController(IWebHostEnvironment environment, IConfiguration configuration) : ControllerBase
{
    [HttpGet("status")]
    public Task<IActionResult> Status(CancellationToken cancellationToken) => Run("status", cancellationToken);

    [HttpPost("prompt")]
    public Task<IActionResult> Prompt(CancellationToken cancellationToken) => Run("prompt", cancellationToken);

    [HttpPost("defer")]
    public Task<IActionResult> Defer(CancellationToken cancellationToken) => Run("defer", cancellationToken);

    [HttpPost("send")]
    public Task<IActionResult> Send(CancellationToken cancellationToken) => Run("send", cancellationToken);

    [HttpPost("send-now")]
    public Task<IActionResult> SendNow(CancellationToken cancellationToken) => Run("manual", cancellationToken);

    private async Task<IActionResult> Run(string action, CancellationToken cancellationToken)
    {
        // This bridge uses this Windows user's private config and DPAPI identity.
        if (!OperatingSystem.IsWindows() || !environment.IsDevelopment() ||
            HttpContext.Connection.RemoteIpAddress is not { } remote || !IPAddress.IsLoopback(remote))
            return NotFound();
        var host = Request.Host.Host.Trim('[', ']');
        if (!host.Equals("localhost", StringComparison.OrdinalIgnoreCase) &&
            !(IPAddress.TryParse(host, out var hostAddress) && IPAddress.IsLoopback(hostAddress)))
            return BadRequest();
        if (Request.Method != "GET")
        {
            if (Request.Headers["X-Zentro-Client"] != "web") return BadRequest();
            var origin = Request.Headers.Origin.ToString();
            if (!string.IsNullOrEmpty(origin) && (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
                uri.Scheme != "http" ||
                !(uri.Authority.Equals(Request.Host.Value, StringComparison.OrdinalIgnoreCase) ||
                  uri.Host == "127.0.0.1" && uri.Port == 5187 || uri.Host == "localhost" && uri.Port == 5187)))
                return BadRequest();
        }
        var root = Path.GetFullPath("..", environment.ContentRootPath);
        var script = Path.Combine(root, "scripts", "monthly-backup.mjs");
        if (!System.IO.File.Exists(script)) return NotFound();
        var node = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
        var start = new ProcessStartInfo(node)
        {
            WorkingDirectory = root,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        start.ArgumentList.Add(script);
        start.ArgumentList.Add("--action");
        start.ArgumentList.Add(action);
        start.Environment.Remove("NODE_OPTIONS");
        start.Environment.Remove("VSCODE_INSPECTOR_OPTIONS");
        start.Environment["ZENTRO_MAIL_DATABASE"] = Path.GetFullPath(configuration["Zentro:DatabasePath"] ?? "Data/zentro.db", environment.ContentRootPath);
        if (configuration["Zentro:MailBackupDirectory"] is { } directory)
            start.Environment["ZENTRO_MAIL_DIRECTORY"] = Path.GetFullPath(directory, environment.ContentRootPath);
        using var process = new Process { StartInfo = start };
        var started = false;
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromMinutes(3));
        try
        {
            process.Start();
            started = true;
            var output = process.StandardOutput.ReadToEndAsync(timeout.Token);
            var errors = process.StandardError.ReadToEndAsync(timeout.Token);
            await process.WaitForExitAsync(timeout.Token);
            var json = JsonSerializer.Deserialize<JsonElement>(await output);
            await errors; // Drain stderr without logging credentials or SMTP details.
            if (process.ExitCode != 0) return BadRequest(json);
            if (json.TryGetProperty("result", out var result) && result.GetString() == "busy")
                return Conflict(new { error = "Hay otra copia en curso. Espera a que termine." });
            return Ok(json);
        }
        catch (Exception exception) when (exception is OperationCanceledException or System.ComponentModel.Win32Exception or JsonException or InvalidOperationException)
        {
            if (started && !process.HasExited) process.Kill(true);
            return StatusCode(503, new { error = "No se pudo completar la copia. Inténtalo de nuevo." });
        }
    }
}
