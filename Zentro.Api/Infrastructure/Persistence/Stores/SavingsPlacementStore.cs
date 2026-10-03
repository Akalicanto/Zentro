using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence.Stores;

/// <summary>Mapeo explícito entre SavingsPlacement y destinos_ahorro. No almacena documentos JSON.</summary>
internal static class SavingsPlacementStore
{
    public static List<SavingsPlacement> Read(SqliteSession session) =>
        session.Query("SELECT * FROM destinos_ahorro WHERE perfil_id=1 ORDER BY orden",
            row => new SavingsPlacement
            {
                Id = row.Text("id"),
                Name = row.Text("nombre"),
                Kind = row.Text("tipo") switch
                {
                    "deposito" => "deposit",
                    "cuenta_remunerada" => "remunerated",
                    _ => throw new InvalidDataException("Valor desconocido en destinos_ahorro.tipo.")
                },
                Amount = row.OptionalNumber("capital_centimos"),
                AnnualRateBps = row.Integer("interes_anual_puntos_basicos"),
                RateType = row.Text("tipo_interes") switch
                {
                    "TIN" => "tin",
                    "TAE" => "tae",
                    _ => throw new InvalidDataException("Valor desconocido en destinos_ahorro.tipo_interes.")
                },
                DayCount = row.OptionalText("metodo_calculo") switch
                {
                    "mensual" => "monthly",
                    "dias_reales_360" => "actual360",
                    null => null,
                    _ => throw new InvalidDataException("Valor desconocido en destinos_ahorro.metodo_calculo.")
                },
                WithholdingBps = row.Integer("retencion_puntos_basicos"),
                Start = row.OptionalText("fecha_inicio"),
                Months = row.OptionalInteger("plazo_meses")
            });

    public static void Write(SqliteSession session, IReadOnlyList<SavingsPlacement> rows)
    {
        for (var index = 0; index < rows.Count; index++)
        {
            var row = rows[index];
            session.Insert("destinos_ahorro",
                ("perfil_id", 1),
                ("orden", index),
                ("id", row.Id),
                ("nombre", row.Name),
                ("tipo", row.Kind switch
                {
                    "deposit" => "deposito",
                    "remunerated" => "cuenta_remunerada",
                    _ => throw new InvalidDataException("Valor desconocido en SavingsPlacement.Kind.")
                }),
                ("capital_centimos", row.Amount),
                ("interes_anual_puntos_basicos", row.AnnualRateBps),
                ("tipo_interes", row.RateType switch
                {
                    "tin" => "TIN",
                    "tae" => "TAE",
                    _ => throw new InvalidDataException("Valor desconocido en SavingsPlacement.RateType.")
                }),
                ("metodo_calculo", row.DayCount switch
                {
                    "monthly" => "mensual",
                    "actual360" => "dias_reales_360",
                    null => null,
                    _ => throw new InvalidDataException("Valor desconocido en SavingsPlacement.DayCount.")
                }),
                ("retencion_puntos_basicos", row.WithholdingBps),
                ("fecha_inicio", row.Start),
                ("plazo_meses", row.Months));
        }
    }
}
