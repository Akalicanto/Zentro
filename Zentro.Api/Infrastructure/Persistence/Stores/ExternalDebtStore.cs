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
                CreatedOn = row.OptionalText("fecha_creacion"),
                CompletedOn = row.OptionalText("fecha_cierre"),
                ArchivedOn = row.OptionalText("fecha_archivo"),
                Notes = row.OptionalText("notas"),
                Activity = row.Flag("historial_registrado") ? ReadActivity(session, row.Text("id")) : null,
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
                ("total_centimos", row.Total),
                ("fecha_creacion", row.CreatedOn),
                ("fecha_cierre", row.CompletedOn),
                ("fecha_archivo", row.ArchivedOn),
                ("notas", row.Notes),
                ("historial_registrado", row.Activity is null ? 0 : 1));
            for (var activityIndex = 0; activityIndex < (row.Activity?.Count ?? 0); activityIndex++)
            {
                var activity = row.Activity![activityIndex];
                session.Insert("historial_deudas", ("perfil_id", 1), ("deuda_id", row.Id), ("orden", activityIndex),
                    ("id", activity.Id), ("fecha", activity.Date), ("descripcion", activity.Description));
            }
        }
    }

    private static List<DebtActivity> ReadActivity(SqliteSession session, string debtId) =>
        session.Query("SELECT * FROM historial_deudas WHERE perfil_id=1 AND deuda_id=$id ORDER BY orden",
            row => new DebtActivity { Id = row.Text("id"), Date = row.Text("fecha"), Description = row.Text("descripcion") }, ("$id", debtId));
}
