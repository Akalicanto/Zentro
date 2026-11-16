using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Zentro.Api.Services;
using Zentro.Api.Infrastructure.Persistence;

namespace Zentro.Api.Controllers;

/// <summary>Versioned, aggregate-only, read-only integration for Habita.</summary>
[ApiController]
[Route("api/integrations/habita/v1/snapshot")]
public sealed class HabitaController(IProfileService profiles, IConfiguration configuration) : ControllerBase
{
    public static bool Authorized(HttpContext context, IConfiguration configuration)
    {
        var secret = configuration["Zentro:Habita:Token"] ?? "";
        var header = context.Request.Headers.Authorization.ToString();
        return secret.Length >= 32 && CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(header)), SHA256.HashData(Encoding.UTF8.GetBytes("Bearer " + secret)));
    }

    [HttpGet]
    public IActionResult Read()
    {
        if (!Authorized(HttpContext, configuration)) return Unauthorized();
        var p = profiles.Read();
        if (p is null) return NoContent();
        var version = ProfileVersion.For(p);
        Response.Headers.ETag = version;
        if (Request.Headers.IfNoneMatch == version) return StatusCode(304);
        var savings = p.Savings.Sum(x => (x.Actual ?? 0) + x.Repayment - x.Withdrawal);
        var interest = p.Interest.Opening + p.Interest.Entries.Sum(x => x.Amount);
        var invested = p.Investment.Sum(x => x.Actual ?? 0);
        var placements = p.SavingsPlacements ?? [];
        var fixedTotal = placements.Sum(x => x.Amount ?? 0);
        var deposits = placements.Where(x => x.Kind == "deposit").Select(x => new
        {
            x.Name, Amount = x.Amount ?? 0,
            Maturity = DateOnly.TryParse(x.Start, out var start) && x.Months is int months ? start.AddMonths(months).ToString("yyyy-MM-dd") : null
        }).ToList();
        var debtSchedule = (p.Debts ?? []).Where(x => x.CompletedOn is null && x.ArchivedOn is null)
            .SelectMany(x => x.Installments.Select(i => new { i.Month, Amount = Math.Max(0, i.Amount - i.Paid) }))
            .GroupBy(x => x.Month).OrderBy(x => x.Key).Select(g => new { Month = g.Key, Amount = g.Sum(x => x.Amount) }).ToList();
        var internalDebt = p.InternalDebt.Items.Sum(x => x.Amount) - p.InternalDebt.Payments.Sum(x => x.Amount);
        // Optional metadata is read without depending on unrelated, uncommitted model extensions.
        var metadata = System.Text.Json.JsonSerializer.SerializeToElement(p, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
        int? mortgageYears = metadata.TryGetProperty("mortgageYears", out var years) && years.TryGetInt32(out var n) ? n : null;
        string? mortgageBank = metadata.TryGetProperty("mortgageBank", out var bank) && bank.ValueKind == System.Text.Json.JsonValueKind.String ? bank.GetString() : null;
        return Ok(new
        {
            SchemaVersion = 1, GeneratedAt = DateTimeOffset.UtcNow, Currency = "EUR", Unit = "cents",
            MonthlyNetIncome = p.MonthlyNetSalary,
            SavingsTotal = savings + interest,
            LiquidSavings = Math.Max(0, savings + interest - deposits.Sum(x => x.Amount)),
            InvestedCapital = invested, Wealth = savings + interest + invested,
            DailyBalance = p.Daily.Opening + p.Daily.Incomes.Where(x => x.Status == "done" && !x.IncludedInOpening).Sum(x => x.Amount)
                - p.Daily.Expenses.Where(x => x.Status == "done" && !x.IncludedInOpening).Sum(x => x.Amount),
            Cash = p.Cash, InternalDebt = internalDebt,
            MonthlySaving = p.Plan.Saving, MonthlyInvestment = p.Plan.Investment,
            Deposits = deposits, DebtSchedule = debtSchedule,
            Accounts = placements.Select(x => new { x.Name, x.Kind, Amount = x.Amount ?? Math.Max(0, savings + interest - fixedTotal) }),
            History = p.Savings.Select(x => new { x.Month, Saving = x.Actual, x.Repayment, x.Withdrawal,
                Investment = p.Investment.FirstOrDefault(i => i.Month == x.Month)?.Actual }),
            BankEstimate = p.MortgageOffer is null ? null : new { Capital = p.MortgageOffer, Years = mortgageYears, Bank = mortgageBank, Status = "bank-estimate" },
            Warnings = new[] { "no-salary-history", "no-consumption-history", "investment-is-contributed-capital", "wealth-is-zentro-gross-metric", "daily-and-cash-excluded-from-purchase", "deposit-maturity-requires-confirmation" }
        });
    }
}
