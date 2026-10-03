using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre ExternalDebt y deudas. No almacena documentos JSON.</summary>
internal static class ExternalDebtStore
{
    public static List<ExternalDebt> Read(SqliteSession session) =>
        session.Query("SELECT * FROM deudas WHERE perfil_id=1 ORDER BY orden",
            row => new ExternalDebt
            {
                Id = row.Text("id"),
                Name = row.Text("nombre"),
                Total = row.Number("total_centimos"),
                Installments = []
            });

    public static void Write(SqliteSession session, IReadOnlyList<ExternalDebt> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("deudas",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("nombre", row.Name),
                ("total_centimos", row.Total));
        }
    }
}
