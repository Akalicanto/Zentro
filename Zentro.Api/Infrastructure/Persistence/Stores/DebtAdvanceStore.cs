using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

internal static class DebtAdvanceStore
{
    public static List<DebtAdvance> Read(SqliteSession session, string debtId) =>
        session.Query("SELECT * FROM adelantos_deudas WHERE perfil_id=1 AND deuda_id=$id ORDER BY orden",
            row => new DebtAdvance { Id = row.Text("id"), Date = row.Text("fecha"), Amount = row.Number("importe_centimos"), Strategy = row.Text("estrategia") == "cuotas" ? "term" : "payment" }, ("$id", debtId));

    public static void Write(SqliteSession session, IReadOnlyList<DebtAdvance> rows, string debtId)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("adelantos_deudas", ("perfil_id", 1), ("deuda_id", debtId), ("orden", index),
                ("id", row.Id), ("fecha", row.Date), ("importe_centimos", row.Amount), ("estrategia", row.Strategy == "term" ? "cuotas" : "importe"));
        }
    }
}
