using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre MonthlyContribution y ahorros_mensuales. No almacena documentos JSON.</summary>
internal static class SavingsMonthStore
{
    public static List<MonthlyContribution> Read(SqliteSession session) =>
        session.Query("SELECT * FROM ahorros_mensuales WHERE perfil_id=1 ORDER BY orden",
            row => new MonthlyContribution
            {
                Month = row.Text("mes"),
                Goal = row.OptionalNumber("objetivo_centimos"),
                Actual = row.OptionalNumber("aportacion_centimos"),
                Repayment = row.Number("repuesto_centimos"),
                Withdrawal = row.Number("retirado_centimos"),
                Approximation = row.OptionalNumber("aproximado_centimos")
            });

    public static void Write(SqliteSession session, IReadOnlyList<MonthlyContribution> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("ahorros_mensuales",
                ("perfil_id", 1),
                ("orden", index),
                ("mes", row.Month),
                ("objetivo_centimos", row.Goal),
                ("aportacion_centimos", row.Actual),
                ("repuesto_centimos", row.Repayment),
                ("retirado_centimos", row.Withdrawal),
                ("aproximado_centimos", row.Approximation));
        }
    }
}
