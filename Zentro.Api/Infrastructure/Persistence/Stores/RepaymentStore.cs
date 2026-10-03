using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre InternalDebtPayment y reposiciones_deuda_interna. No almacena documentos JSON.</summary>
internal static class RepaymentStore
{
    public static List<InternalDebtPayment> Read(SqliteSession session) =>
        session.Query("SELECT * FROM reposiciones_deuda_interna WHERE perfil_id=1 ORDER BY orden",
            row => new InternalDebtPayment
            {
                Id = row.Text("id"),
                Date = row.Text("fecha"),
                Amount = row.Number("importe_centimos"),
                Historical = row.Flag("historica"),
                Allocations = []
            });

    public static void Write(SqliteSession session, IReadOnlyList<InternalDebtPayment> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("reposiciones_deuda_interna",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("fecha", row.Date),
                ("importe_centimos", row.Amount),
                ("historica", row.Historical));
        }
    }
}
