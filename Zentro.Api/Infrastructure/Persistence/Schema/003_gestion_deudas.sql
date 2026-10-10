ALTER TABLE deudas ADD COLUMN fecha_creacion TEXT;
ALTER TABLE deudas ADD COLUMN fecha_cierre TEXT;
ALTER TABLE deudas ADD COLUMN fecha_archivo TEXT;
ALTER TABLE deudas ADD COLUMN notas TEXT;
ALTER TABLE deudas ADD COLUMN historial_registrado INTEGER NOT NULL DEFAULT 0 CHECK(historial_registrado IN (0,1));

CREATE TABLE historial_deudas (
 perfil_id INTEGER NOT NULL,
 deuda_id TEXT NOT NULL,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 fecha TEXT NOT NULL CHECK(length(fecha)=10),
 descripcion TEXT NOT NULL CHECK(length(trim(descripcion)) BETWEEN 1 AND 1000),
 PRIMARY KEY(perfil_id,deuda_id,id),
 UNIQUE(perfil_id,deuda_id,orden),
 FOREIGN KEY(perfil_id,deuda_id) REFERENCES deudas(perfil_id,id) ON DELETE CASCADE
) STRICT;
