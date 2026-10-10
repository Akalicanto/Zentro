DROP VIEW IF EXISTS vista_deudas;
CREATE VIEW vista_deudas AS
WITH cuotas AS (
 SELECT perfil_id,deuda_id,
 SUM(CASE WHEN estado='pagado' THEN importe_centimos ELSE 0 END) AS pagado,
 SUM(CASE WHEN estado='apartado' THEN importe_centimos ELSE 0 END) AS apartado
 FROM cuotas_deudas GROUP BY perfil_id,deuda_id
), adelantos AS (
 SELECT perfil_id,deuda_id,SUM(importe_centimos) AS pagado
 FROM adelantos_deudas GROUP BY perfil_id,deuda_id
)
SELECT d.perfil_id,d.id,d.nombre,d.total_centimos/100.0 AS total_euros,
 (COALESCE(c.pagado,0)+COALESCE(a.pagado,0))/100.0 AS pagado_euros,
 COALESCE(c.apartado,0)/100.0 AS apartado_euros,
 (d.total_centimos-COALESCE(c.pagado,0)-COALESCE(a.pagado,0))/100.0 AS restante_euros
FROM deudas d
LEFT JOIN cuotas c ON c.perfil_id=d.perfil_id AND c.deuda_id=d.id
LEFT JOIN adelantos a ON a.perfil_id=d.perfil_id AND a.deuda_id=d.id;
