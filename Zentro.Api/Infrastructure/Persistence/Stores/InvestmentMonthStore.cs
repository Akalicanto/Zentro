using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre MonthlyContribution y inversiones_mensuales. No almacena documentos JSON.</summary>
internal static class InvestmentMonthStore
{
    public static List<MonthlyContribution> Read(SqliteSession session) =>
        session.Query("SELECT * FROM inversiones_mensuales WHERE perfil_id=1 ORDER BY orden",
            row => new MonthlyContribution
            {
                Month = row.Text("mes"),
                Goal = row.OptionalNumber("objetivo_centimos"),
                Actual = row.OptionalNumber("aportacion_centimos"),
                Approximation = row.OptionalNumber("aproximado_centimos"),
                Repayment = 0,
                Withdrawal = 0
            });

    public static void Write(SqliteSession session, IReadOnlyList<MonthlyContribution> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("inversiones_mensuales",
                ("perfil_id", 1),
                ("orden", index),
                ("mes", row.Month),
                ("objetivo_centimos", row.Goal),
                ("aportacion_centimos", row.Actual),
                ("aproximado_centimos", row.Approximation));
        }
    }
}
