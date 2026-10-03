using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre DailyMovement y movimientos_diarios. No almacena documentos JSON.</summary>
internal static class DailyMovementStore
{
    public static List<DailyMovement> Read(SqliteSession session, string parent) =>
        session.Query("SELECT * FROM movimientos_diarios WHERE perfil_id=1 AND tipo=$parent ORDER BY orden",
            row => new DailyMovement
            {
                Id = row.Text("id"),
                Month = row.Text("mes"),
                Concept = row.Text("concepto"),
                Amount = row.Number("importe_centimos"),
                Status = row.Text("estado") switch
                {
                    "previsto" => "planned",
                    "realizado" => "done",
                    _ => throw new InvalidDataException("Valor desconocido en movimientos_diarios.estado.")
                },
                IncludedInOpening = row.Flag("incluido_en_saldo_inicial")
            }, ("$parent", parent));

    public static void Write(SqliteSession session, IReadOnlyList<DailyMovement> rows, string parent)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("movimientos_diarios",
                ("perfil_id", 1),
                ("orden", index),
                ("tipo", parent),
                ("id", row.Id),
                ("mes", row.Month),
                ("concepto", row.Concept),
                ("importe_centimos", row.Amount),
                ("estado", row.Status switch
                {
                    "planned" => "previsto",
                    "done" => "realizado",
                    _ => throw new InvalidDataException("Valor desconocido en DailyMovement.Status.")
                }),
                ("incluido_en_saldo_inicial", row.IncludedInOpening));
        }
    }
}
