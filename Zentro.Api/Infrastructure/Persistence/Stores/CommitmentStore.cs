using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre Commitment y compromisos. No almacena documentos JSON.</summary>
internal static class CommitmentStore
{
    public static List<Commitment> Read(SqliteSession session) =>
        session.Query("SELECT * FROM compromisos WHERE perfil_id=1 ORDER BY orden",
            row => new Commitment
            {
                Id = row.Text("id"),
                Name = row.Text("nombre"),
                Amount = row.OptionalNumber("importe_centimos")
            });

    public static void Write(SqliteSession session, IReadOnlyList<Commitment> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("compromisos",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("nombre", row.Name),
                ("importe_centimos", row.Amount));
        }
    }
}
