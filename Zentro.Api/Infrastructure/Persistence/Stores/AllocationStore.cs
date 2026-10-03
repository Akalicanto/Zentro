using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre DebtAllocation y repartos_reposiciones. No almacena documentos JSON.</summary>
internal static class AllocationStore
{
    public static List<DebtAllocation> Read(SqliteSession session, string parent) =>
        session.Query("SELECT * FROM repartos_reposiciones WHERE perfil_id=1 AND reposicion_id=$parent ORDER BY orden",
            row => new DebtAllocation
            {
                Item = row.Text("retirada_id"),
                Amount = row.Number("importe_centimos")
            }, ("$parent", parent));

    public static void Write(SqliteSession session, IReadOnlyList<DebtAllocation> rows, string parent)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("repartos_reposiciones",
                ("perfil_id", 1),
                ("orden", index),
                ("reposicion_id", parent),
                ("retirada_id", row.Item),
                ("importe_centimos", row.Amount));
        }
    }
}
