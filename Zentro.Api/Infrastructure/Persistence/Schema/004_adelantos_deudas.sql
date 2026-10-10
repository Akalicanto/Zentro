ALTER TABLE deudas ADD COLUMN adelantos_registrados INTEGER NOT NULL DEFAULT 0 CHECK(adelantos_registrados IN (0,1));

CREATE TABLE adelantos_deudas (
 perfil_id INTEGER NOT NULL,
 deuda_id TEXT NOT NULL,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 fecha TEXT NOT NULL CHECK(length(fecha)=10),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0 AND importe_centimos<=9007199254740991),
 estrategia TEXT NOT NULL CHECK(estrategia IN ('cuotas','importe')),
 PRIMARY KEY(perfil_id,deuda_id,id),
 UNIQUE(perfil_id,deuda_id,orden),
 FOREIGN KEY(perfil_id,deuda_id) REFERENCES deudas(perfil_id,id) ON DELETE CASCADE
) STRICT;
