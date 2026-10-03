using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre RepaymentScheduleEntry y calendario_reposiciones. No almacena documentos JSON.</summary>
internal static class RepaymentScheduleStore
{
    public static List<RepaymentScheduleEntry> Read(SqliteSession session) =>
        session.Query("SELECT * FROM calendario_reposiciones WHERE perfil_id=1 ORDER BY orden",
            row => new RepaymentScheduleEntry
            {
                Month = row.Text("mes"),
                Amount = row.Number("importe_centimos")
            });

    public static void Write(SqliteSession session, IReadOnlyList<RepaymentScheduleEntry> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("calendario_reposiciones",
                ("perfil_id", 1),
                ("orden", index),
                ("mes", row.Month),
                ("importe_centimos", row.Amount));
        }
    }
}
