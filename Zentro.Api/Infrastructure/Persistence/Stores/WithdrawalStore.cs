using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre InternalDebtItem y retiradas_deuda_interna. No almacena documentos JSON.</summary>
internal static class WithdrawalStore
{
    public static List<InternalDebtItem> Read(SqliteSession session) =>
        session.Query("SELECT * FROM retiradas_deuda_interna WHERE perfil_id=1 ORDER BY orden",
            row => new InternalDebtItem
            {
                Id = row.Text("id"),
                Date = row.Text("fecha"),
                Concept = row.Text("concepto"),
                Amount = row.Number("importe_centimos"),
                Source = row.Text("origen") switch
                {
                    "ahorro" => "work",
                    "intereses" => "interest",
                    _ => throw new InvalidDataException("Valor desconocido en retiradas_deuda_interna.origen.")
                },
                Historical = row.Flag("historica")
            });

    public static void Write(SqliteSession session, IReadOnlyList<InternalDebtItem> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("retiradas_deuda_interna",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("fecha", row.Date),
                ("concepto", row.Concept),
                ("importe_centimos", row.Amount),
                ("origen", row.Source switch
                {
                    "work" => "ahorro",
                    "interest" => "intereses",
                    _ => throw new InvalidDataException("Valor desconocido en InternalDebtItem.Source.")
                }),
                ("historica", row.Historical));
        }
    }
}
