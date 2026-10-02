# Zentro

Aplicación personal de finanzas en español, React + TypeScript + Vite. Sin backend, base de datos ni conexiones bancarias.

## Arranque

Haz doble clic en `Iniciar-Zentro.cmd` y abre http://127.0.0.1:5187 en Chrome. También puedes ejecutar `npm run dev` desde esta carpeta. Detén únicamente este servidor con Ctrl+C; el navegador permanece abierto. El puerto es fijo y estricto: si está ocupado, el arranque falla sin detener otros servicios.

Dependencias ya instaladas localmente. Para reinstalarlas: `npm ci --cache .npm-cache`. Verificación: `npm test`, `npm run build` y, con el servidor iniciado, `node browser-test.mjs` (requiere Chrome instalado). Las capturas de comprobación se guardan en `checks/`.

## Modelo financiero

- Importes enteros en céntimos. Cálculos centralizados en `src/finance.ts`.
- El saldo inicial de una cuenta es una fotografía antes de los movimientos de su fecha. Un movimiento realizado actualiza una sola vez sus cuentas; uno pendiente solo actualiza la previsión. La proyección incluye pendientes anteriores al mes elegido, para no ocultar compromisos atrasados.
- Patrimonio = cuentas diarias + efectivo + ahorros + capital invertido − deuda externa. No representa cotización de inversiones. La deuda interna no se resta: es un compromiso de reposición, no una obligación externa.
- Las devoluciones internas transfieren dinero entre cuentas y amortizan la deuda por el mismo importe. Para una retirada nueva, registra su gasto o transferencia y crea el compromiso de reposición; crear la ficha de deuda no modifica por sí solo ningún saldo.
- Reservar una cuota no reduce deuda ni saldo bancario. Al marcarla realizada se descuenta una vez el importe de la cuenta. Se admiten pagos parciales, edición y eliminación; los saldos se reconstruyen a partir del registro.
- Ahorro futuro a diciembre usa las aportaciones registradas. La segunda estimación añade la deuda interna completa pendiente, descontando las reposiciones ya incluidas en el plan: presupone que se repone toda antes de diciembre y lo indica explícitamente.
- El plan mensual es realizado + pendiente, no una fotografía inmutable del presupuesto original. Cada repetición es independiente. Editar una mensualidad conserva las demás.
- Bancos configurables en cada cuenta; no se conectan a ninguna entidad. Los objetivos miden el saldo de su cuenta de ahorro, no un fondo adicional.

## Interpretación de las capturas

La demostración tiene una fecha de corte de 1 de octubre de 2026. Cuenta diaria 554,20 €, ahorros 21.450,83 €, aportaciones de inversión 5.750 € y efectivo 410 €. El ahorro ya incluye 450,83 € de intereses, según tu aclaración. Esos intereses históricos no se asignan a un año al desconocer sus fechas. Los meses anteriores al saldo inicial no se han reconstruido a partir de imágenes.

Los gastos cotidianos de la captura más la cuota de deuda suman 421,40 €, dejando 132,80 € antes de nuevas aportaciones. La deuda externa original de 3.162 €, menos 1.264,80 € efectivamente pagados, deja 1.897,20 € pendientes. Los 210,80 € reservados siguen siendo deuda. La captura agrupa algunas cifras de otra forma: se prioriza la distinción solicitada entre reservado y pagado.

Los orígenes de deuda interna suman 1.000 €. El pago de 500 € de la captura no se aplica automáticamente porque no está conciliado con esos conceptos. Los datos están identificados como demostración y pueden restaurarse o borrarse en Configuración. La planificación de aportaciones es ilustrativa y puede mostrar déficit hasta que registres ingresos.

## Persistencia y copias

Datos en `localStorage`, clave `zentro.v1`, independientes por navegador y dirección. No es almacenamiento definitivo. Exporta JSON periódicamente desde Configuración; importarlo sustituye los datos tras confirmación y validación. CSV exporta movimientos, no una copia completa. No se guardan datos financieros en servidores ni repositorios remotos.

La demostración incluye metadatos de intereses históricos únicamente como referencia; al empezar de cero, utiliza saldos iniciales que ya incluyan todos los intereses anteriores y registra solamente los nuevos abonos.

El estilo solicita fuentes de Google Fonts, con fuentes locales de respaldo. La aplicación y sus datos funcionan sin integración con servicios financieros. Arquitectura sencilla: `finance.ts` modelo y cálculos, `App.tsx` vistas y formularios, `style.css` presentación. El esquema versionado permite sustituir localStorage por una base de datos local en una fase posterior.
