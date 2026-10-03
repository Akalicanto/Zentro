using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre InterestEntry y movimientos_intereses. No almacena documentos JSON.</summary>
internal static class InterestEntryStore
{
    public static List<InterestEntry> Read(SqliteSession session) =>
        session.Query("SELECT * FROM movimientos_intereses WHERE perfil_id=1 ORDER BY orden",
            row => new InterestEntry
            {
                Id = row.Text("id"),
                Date = row.Text("fecha"),
                Concept = row.Text("concepto"),
                Amount = row.Number("importe_centimos")
            });

    public static void Write(SqliteSession session, IReadOnlyList<InterestEntry> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("movimientos_intereses",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("fecha", row.Date),
                ("concepto", row.Concept),
                ("importe_centimos", row.Amount),
                ("retirada_id", row.Amount < 0 ? row.Id["withdraw-".Length..] : null));
        }
    }
}
