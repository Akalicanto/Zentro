-- Esquema relacional v1. Importes enteros en céntimos; tipos en puntos básicos (100 = 1 %).
-- NULL conserva «sin registrar»; orden conserva el orden elegido en la aplicación.
CREATE TABLE perfil (
 id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL CHECK(version=2),
 efectivo_centimos INTEGER CHECK(efectivo_centimos>=0),
 oferta_hipoteca_centimos INTEGER CHECK(oferta_hipoteca_centimos>=0),
 actualizado_el TEXT NOT NULL
) STRICT;
CREATE TABLE saldo_diario (
 perfil_id INTEGER PRIMARY KEY REFERENCES perfil(id) ON DELETE CASCADE,
 saldo_inicial_centimos INTEGER NOT NULL, fecha_saldo TEXT NOT NULL CHECK(fecha_saldo IS NULL OR (length(fecha_saldo)=10 AND fecha_saldo GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha_saldo) IS NOT NULL AND date(fecha_saldo)=fecha_saldo))
) STRICT;
CREATE TABLE saldo_intereses (
 perfil_id INTEGER PRIMARY KEY REFERENCES perfil(id) ON DELETE CASCADE,
 saldo_inicial_centimos INTEGER NOT NULL CHECK(saldo_inicial_centimos>=0),
 fecha_saldo TEXT NOT NULL CHECK(fecha_saldo IS NULL OR (length(fecha_saldo)=10 AND fecha_saldo GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha_saldo) IS NOT NULL AND date(fecha_saldo)=fecha_saldo))
) STRICT;
CREATE TABLE plan_mensual (
 perfil_id INTEGER PRIMARY KEY REFERENCES perfil(id) ON DELETE CASCADE,
 mes_inicio TEXT NOT NULL CHECK(length(mes_inicio)=7 AND mes_inicio GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes_inicio,6,2) BETWEEN '01' AND '12'), mes_final TEXT NOT NULL CHECK(length(mes_final)=7 AND mes_final GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes_final,6,2) BETWEEN '01' AND '12'),
 ahorro_centimos INTEGER NOT NULL CHECK(ahorro_centimos>=0),
 inversion_centimos INTEGER NOT NULL CHECK(inversion_centimos>=0),
 reposicion_centimos INTEGER NOT NULL CHECK(reposicion_centimos>=0),
 objetivo_ahorro_centimos INTEGER CHECK(objetivo_ahorro_centimos>=0),
 CHECK(mes_final>=mes_inicio)
) STRICT;

CREATE TABLE movimientos_diarios (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 tipo TEXT NOT NULL CHECK(tipo IN ('gasto','ingreso')),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 mes TEXT NOT NULL CHECK(length(mes)=7 AND mes GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes,6,2) BETWEEN '01' AND '12'),
 concepto TEXT NOT NULL CHECK(length(trim(concepto))>0),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0),
 estado TEXT NOT NULL CHECK(estado IN ('previsto','realizado')),
 incluido_en_saldo_inicial INTEGER NOT NULL CHECK(incluido_en_saldo_inicial IN (0,1)),
 PRIMARY KEY(perfil_id,tipo,id),
 UNIQUE(perfil_id,tipo,orden),
 CHECK(incluido_en_saldo_inicial=0 OR estado='realizado')
) STRICT;

CREATE TABLE ahorros_mensuales (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 mes TEXT NOT NULL CHECK(length(mes)=7 AND mes GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes,6,2) BETWEEN '01' AND '12'),
 objetivo_centimos INTEGER  CHECK(objetivo_centimos>=0),
 aportacion_centimos INTEGER,
 repuesto_centimos INTEGER NOT NULL CHECK(repuesto_centimos>=0),
 retirado_centimos INTEGER NOT NULL CHECK(retirado_centimos>=0),
 aproximado_centimos INTEGER  CHECK(aproximado_centimos>=0),
 PRIMARY KEY(perfil_id,mes),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE inversiones_mensuales (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 mes TEXT NOT NULL CHECK(length(mes)=7 AND mes GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes,6,2) BETWEEN '01' AND '12'),
 objetivo_centimos INTEGER  CHECK(objetivo_centimos>=0),
 aportacion_centimos INTEGER,
 aproximado_centimos INTEGER  CHECK(aproximado_centimos>=0),
 PRIMARY KEY(perfil_id,mes),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE retiradas_deuda_interna (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 fecha TEXT NOT NULL CHECK(fecha IS NULL OR (length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha) IS NOT NULL AND date(fecha)=fecha)),
 concepto TEXT NOT NULL CHECK(length(trim(concepto))>0),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0),
 origen TEXT NOT NULL CHECK(origen IN ('ahorro','intereses')),
 historica INTEGER NOT NULL CHECK(historica IN (0,1)),
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE reposiciones_deuda_interna (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 fecha TEXT NOT NULL CHECK(fecha IS NULL OR (length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha) IS NOT NULL AND date(fecha)=fecha)),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0),
 historica INTEGER NOT NULL CHECK(historica IN (0,1)),
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE repartos_reposiciones (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 reposicion_id TEXT NOT NULL,
 retirada_id TEXT NOT NULL CHECK(length(trim(retirada_id))>0),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0),
 PRIMARY KEY(perfil_id,reposicion_id,orden),
 UNIQUE(perfil_id,reposicion_id,orden),
 FOREIGN KEY(perfil_id,reposicion_id) REFERENCES reposiciones_deuda_interna(perfil_id,id) ON DELETE CASCADE,
 FOREIGN KEY(perfil_id,retirada_id) REFERENCES retiradas_deuda_interna(perfil_id,id) ON DELETE CASCADE
) STRICT;

CREATE TABLE calendario_reposiciones (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 mes TEXT NOT NULL CHECK(length(mes)=7 AND mes GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes,6,2) BETWEEN '01' AND '12'),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>=0),
 PRIMARY KEY(perfil_id,mes),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE movimientos_intereses (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 retirada_id TEXT,
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 fecha TEXT NOT NULL CHECK(fecha IS NULL OR (length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha) IS NOT NULL AND date(fecha)=fecha)),
 concepto TEXT NOT NULL CHECK(length(trim(concepto))>0),
 importe_centimos INTEGER NOT NULL,
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden),
 FOREIGN KEY(perfil_id,retirada_id) REFERENCES retiradas_deuda_interna(perfil_id,id) ON DELETE CASCADE,
 CHECK((importe_centimos<0 AND retirada_id IS NOT NULL) OR (importe_centimos>=0 AND retirada_id IS NULL))
) STRICT;

CREATE TABLE deudas (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 nombre TEXT NOT NULL CHECK(length(trim(nombre))>0),
 total_centimos INTEGER NOT NULL CHECK(total_centimos>=0),
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE cuotas_deudas (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 deuda_id TEXT NOT NULL,
 mes TEXT NOT NULL CHECK(length(mes)=7 AND mes GLOB '[1-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(mes,6,2) BETWEEN '01' AND '12'),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0),
 estado TEXT NOT NULL CHECK(estado IN ('pagado','apartado','pendiente')),
 PRIMARY KEY(perfil_id,deuda_id,mes),
 UNIQUE(perfil_id,deuda_id,orden),
 FOREIGN KEY(perfil_id,deuda_id) REFERENCES deudas(perfil_id,id) ON DELETE CASCADE
) STRICT;

CREATE TABLE destinos_ahorro (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 nombre TEXT NOT NULL CHECK(length(trim(nombre))>0),
 tipo TEXT NOT NULL CHECK(tipo IN ('deposito','cuenta_remunerada')),
 capital_centimos INTEGER  CHECK(capital_centimos>=0),
 interes_anual_puntos_basicos INTEGER NOT NULL CHECK(interes_anual_puntos_basicos BETWEEN 0 AND 10000),
 tipo_interes TEXT NOT NULL CHECK(tipo_interes IN ('TIN','TAE')),
 metodo_calculo TEXT  CHECK(metodo_calculo IN ('mensual','dias_reales_360')),
 retencion_puntos_basicos INTEGER NOT NULL CHECK(retencion_puntos_basicos BETWEEN 0 AND 10000),
 fecha_inicio TEXT  CHECK(fecha_inicio IS NULL OR (length(fecha_inicio)=10 AND fecha_inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha_inicio) IS NOT NULL AND date(fecha_inicio)=fecha_inicio)),
 plazo_meses INTEGER  CHECK(plazo_meses BETWEEN 1 AND 600),
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden),
 CHECK((tipo='deposito' AND capital_centimos IS NOT NULL AND fecha_inicio IS NOT NULL AND plazo_meses IS NOT NULL) OR (tipo='cuenta_remunerada' AND fecha_inicio IS NULL AND plazo_meses IS NULL)),
 CHECK(metodo_calculo IS NOT 'dias_reales_360' OR (tipo='cuenta_remunerada' AND tipo_interes='TIN'))
) STRICT;

CREATE TABLE posibles_gastos (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 concepto TEXT NOT NULL CHECK(length(trim(concepto))>0),
 importe_centimos INTEGER NOT NULL CHECK(importe_centimos>0),
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE TABLE compromisos (
 perfil_id INTEGER NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
 orden INTEGER NOT NULL CHECK(orden>=0),
 id TEXT NOT NULL CHECK(length(trim(id))>0),
 nombre TEXT NOT NULL CHECK(length(trim(nombre))>0),
 importe_centimos INTEGER  CHECK(importe_centimos>=0),
 PRIMARY KEY(perfil_id,id),
 UNIQUE(perfil_id,orden)
) STRICT;

CREATE UNIQUE INDEX un_destino_automatico ON destinos_ahorro(perfil_id) WHERE capital_centimos IS NULL;
CREATE INDEX movimientos_por_mes ON movimientos_diarios(perfil_id,mes,tipo);
CREATE INDEX intereses_por_fecha ON movimientos_intereses(perfil_id,fecha);
CREATE INDEX reparto_por_retirada ON repartos_reposiciones(perfil_id,retirada_id);

CREATE VIEW vista_ahorros_mensuales AS SELECT perfil_id,mes,
 objetivo_centimos/100.0 AS objetivo_euros, aportacion_centimos/100.0 AS aportado_euros,
 repuesto_centimos/100.0 AS repuesto_euros, retirado_centimos/100.0 AS retirado_euros,
 CASE WHEN aportacion_centimos IS NULL AND repuesto_centimos=0 AND retirado_centimos=0 THEN NULL
 ELSE (COALESCE(aportacion_centimos,0)+repuesto_centimos-retirado_centimos)/100.0 END AS neto_euros,
 aproximado_centimos/100.0 AS previsto_euros FROM ahorros_mensuales;
CREATE VIEW vista_inversiones_mensuales AS SELECT perfil_id,mes,
 objetivo_centimos/100.0 AS objetivo_euros, aportacion_centimos/100.0 AS aportado_euros,
 aproximado_centimos/100.0 AS previsto_euros FROM inversiones_mensuales;
CREATE VIEW vista_deudas AS SELECT d.perfil_id,d.id,d.nombre,d.total_centimos/100.0 AS total_euros,
 COALESCE(SUM(CASE WHEN c.estado='pagado' THEN c.importe_centimos ELSE 0 END),0)/100.0 AS pagado_euros,
 COALESCE(SUM(CASE WHEN c.estado='apartado' THEN c.importe_centimos ELSE 0 END),0)/100.0 AS apartado_euros,
 (d.total_centimos-COALESCE(SUM(CASE WHEN c.estado='pagado' THEN c.importe_centimos ELSE 0 END),0))/100.0 AS restante_euros
 FROM deudas d LEFT JOIN cuotas_deudas c ON c.perfil_id=d.perfil_id AND c.deuda_id=d.id GROUP BY d.perfil_id,d.id;
CREATE VIEW vista_deuda_interna AS SELECT r.perfil_id,r.id,r.fecha,r.concepto,r.origen,
 r.importe_centimos/100.0 AS retirado_euros,COALESCE(SUM(a.importe_centimos),0)/100.0 AS repuesto_euros,
 (r.importe_centimos-COALESCE(SUM(a.importe_centimos),0))/100.0 AS pendiente_euros
 FROM retiradas_deuda_interna r LEFT JOIN repartos_reposiciones a ON a.perfil_id=r.perfil_id AND a.retirada_id=r.id GROUP BY r.perfil_id,r.id;
CREATE VIEW vista_resumen AS WITH importes AS (
 SELECT p.id,p.efectivo_centimos,p.oferta_hipoteca_centimos,
 d.saldo_inicial_centimos+COALESCE((SELECT SUM(CASE WHEN tipo='ingreso' THEN importe_centimos ELSE -importe_centimos END)
 FROM movimientos_diarios WHERE perfil_id=p.id AND estado='realizado' AND incluido_en_saldo_inicial=0),0) AS diario,
 COALESCE((SELECT SUM(COALESCE(aportacion_centimos,0)+repuesto_centimos-retirado_centimos) FROM ahorros_mensuales WHERE perfil_id=p.id),0) AS ahorro,
 i.saldo_inicial_centimos+COALESCE((SELECT SUM(importe_centimos) FROM movimientos_intereses WHERE perfil_id=p.id),0) AS intereses,
 COALESCE((SELECT SUM(aportacion_centimos) FROM inversiones_mensuales WHERE perfil_id=p.id),0) AS inversion
 FROM perfil p JOIN saldo_diario d ON d.perfil_id=p.id JOIN saldo_intereses i ON i.perfil_id=p.id)
 SELECT id AS perfil_id,diario/100.0 AS diario_euros,efectivo_centimos/100.0 AS efectivo_euros,
 ahorro/100.0 AS ahorro_euros,intereses/100.0 AS intereses_euros,inversion/100.0 AS inversion_euros,
 (ahorro+intereses+inversion)/100.0 AS patrimonio_euros,oferta_hipoteca_centimos/100.0 AS oferta_hipoteca_euros FROM importes;
