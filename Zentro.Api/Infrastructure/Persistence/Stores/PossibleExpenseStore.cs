using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre PossibleExpense y posibles_gastos. No almacena documentos JSON.</summary>
internal static class PossibleExpenseStore
{
    public static List<PossibleExpense> Read(SqliteSession session) =>
        session.Query("SELECT * FROM posibles_gastos WHERE perfil_id=1 ORDER BY orden",
            row => new PossibleExpense
            {
                Id = row.Text("id"),
                Concept = row.Text("concepto"),
                Amount = row.Number("importe_centimos")
            });

    public static void Write(SqliteSession session, IReadOnlyList<PossibleExpense> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("posibles_gastos",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("concepto", row.Concept),
                ("importe_centimos", row.Amount));
        }
    }
}
