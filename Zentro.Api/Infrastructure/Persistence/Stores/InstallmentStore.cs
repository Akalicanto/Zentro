using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre DebtInstallment y cuotas_deudas. No almacena documentos JSON.</summary>
internal static class InstallmentStore
{
    public static List<DebtInstallment> Read(SqliteSession session, string parent) =>
        session.Query("SELECT * FROM cuotas_deudas WHERE perfil_id=1 AND deuda_id=$parent ORDER BY orden",
            row => new DebtInstallment
            {
                Month = row.Text("mes"),
                Amount = row.Number("importe_centimos"),
                Status = row.Text("estado") switch
                {
                    "pagado" => "paid",
                    "apartado" => "reserved",
                    "pendiente" => "pending",
                    _ => throw new InvalidDataException("Valor desconocido en cuotas_deudas.estado.")
                }
            }, ("$parent", parent));

    public static void Write(SqliteSession session, IReadOnlyList<DebtInstallment> rows, string parent)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("cuotas_deudas",
                ("perfil_id", 1),
                ("orden", index),
                ("deuda_id", parent),
                ("mes", row.Month),
                ("importe_centimos", row.Amount),
                ("estado", row.Status switch
                {
                    "paid" => "pagado",
                    "reserved" => "apartado",
                    "pending" => "pendiente",
                    _ => throw new InvalidDataException("Valor desconocido en DebtInstallment.Status.")
                }));
        }
    }
}
