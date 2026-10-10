-- Día a día contiene previsiones independientes de cualquier mes.
DROP INDEX movimientos_por_mes;
ALTER TABLE movimientos_diarios DROP COLUMN mes;
CREATE INDEX movimientos_por_tipo ON movimientos_diarios(perfil_id,tipo);
