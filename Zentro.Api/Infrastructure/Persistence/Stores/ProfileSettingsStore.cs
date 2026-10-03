using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

internal static class ProfileSettingsStore
{
    public static FinancialProfile? Read(SqliteSession session)
    {
        var profile = session.Query("SELECT * FROM perfil WHERE id=1", row => new FinancialProfile
        {
            Version = row.Integer("version"),
            Cash = row.OptionalNumber("efectivo_centimos"),
            MortgageOffer = row.OptionalNumber("oferta_hipoteca_centimos"),
            Daily = null!,
            Interest = null!,
            Plan = null!,
            Savings = [],
            Investment = [],
            Commitments = [],
            InternalDebt = new InternalDebt { Items = [], Payments = [], Schedule = [] }
        }).SingleOrDefault();
        if (profile is null)
        {
            return null;
        }
        return profile with
        {
            Daily = session.Query("SELECT * FROM saldo_diario WHERE perfil_id=1", row => new DailyBudget
            {
                Opening = row.Number("saldo_inicial_centimos"),
                AsOf = row.Text("fecha_saldo"),
                Expenses = [],
                Incomes = []
            }).Single(),
            Interest = session.Query("SELECT * FROM saldo_intereses WHERE perfil_id=1", row => new InterestAccount
            {
                Opening = row.Number("saldo_inicial_centimos"),
                AsOf = row.Text("fecha_saldo"),
                Entries = []
            }).Single(),
            Plan = session.Query("SELECT * FROM plan_mensual WHERE perfil_id=1", row => new FinancialPlan
            {
                Start = row.Text("mes_inicio"),
                Horizon = row.Text("mes_final"),
                Saving = row.Number("ahorro_centimos"),
                Investment = row.Number("inversion_centimos"),
                Repayment = row.Number("reposicion_centimos"),
                SavingsTarget = row.OptionalNumber("objetivo_ahorro_centimos")
            }).Single()
        };
    }

    public static void Write(SqliteSession session, FinancialProfile profile)
    {
        session.Insert("perfil", ("id", 1), ("version", profile.Version),
            ("efectivo_centimos", profile.Cash), ("oferta_hipoteca_centimos", profile.MortgageOffer),
            ("actualizado_el", DateTimeOffset.UtcNow.ToString("O")));
        session.Insert("saldo_diario", ("perfil_id", 1), ("saldo_inicial_centimos", profile.Daily.Opening), ("fecha_saldo", profile.Daily.AsOf));
        session.Insert("saldo_intereses", ("perfil_id", 1), ("saldo_inicial_centimos", profile.Interest.Opening), ("fecha_saldo", profile.Interest.AsOf));
        session.Insert("plan_mensual", ("perfil_id", 1), ("mes_inicio", profile.Plan.Start), ("mes_final", profile.Plan.Horizon),
            ("ahorro_centimos", profile.Plan.Saving), ("inversion_centimos", profile.Plan.Investment),
            ("reposicion_centimos", profile.Plan.Repayment), ("objetivo_ahorro_centimos", profile.Plan.SavingsTarget));
    }
}
