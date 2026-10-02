# Zentro

Aplicación personal de finanzas en español, React + TypeScript + Vite, conectada a Zentro.Api (.NET 10 + SQLite). Sin conexiones bancarias.

## Arranque

El arranque conjunto y las instrucciones de VS Code están en el [README de la raíz](../README.md). Desde esta carpeta, `npm.cmd run dev` arranca únicamente el front y necesita la API en el puerto 5080.

Dependencias ya instaladas localmente. Para reinstalarlas: `npm.cmd ci`. Verificación: `npm.cmd test`, `npm.cmd run build` y, con ambos servicios iniciados, `node browser-test.mjs` (Chromium de Playwright). La prueba de navegador usa temporalmente la demostración y restaura el documento anterior al terminar; ejecútala sin editar en otras pestañas. Las capturas se guardan en `checks/`.

## Modelo financiero

- Importes enteros en céntimos. Cálculos centralizados en `src/finance.ts`.
- El saldo inicial de una cuenta es una fotografía antes de los movimientos de su fecha. Un movimiento realizado actualiza una sola vez sus cuentas; uno pendiente solo actualiza la previsión. La proyección incluye pendientes anteriores al mes elegido, para no ocultar compromisos atrasados.
- Patrimonio = cuentas diarias + efectivo + ahorros + capital invertido − deuda externa. No representa cotización de inversiones. La deuda interna no se resta: es un compromiso de reposición, no una obligación externa.
- Las devoluciones internas transfieren dinero entre cuentas y amortizan la deuda por el mismo importe. Para una retirada nueva, registra su gasto o transferencia y crea el compromiso de reposición; crear la ficha de deuda no modifica por sí solo ningún saldo.
- Reservar una cuota no reduce deuda ni saldo bancario. Al marcarla realizada se descuenta una vez el importe de la cuenta. Se admiten pagos parciales, edición y eliminación; los saldos se reconstruyen a partir del registro.
- Ahorro futuro a diciembre usa las aportaciones registradas. La segunda estimación añade la deuda interna completa pendiente, descontando las reposiciones ya incluidas en el plan: presupone que se repone toda antes de diciembre y lo indica explícitamente.
- El plan mensual es realizado + pendiente, no una fotografía inmutable del presupuesto original. Cada repetición es independiente. Editar una mensualidad conserva las demás.
- Bancos configurables en cada cuenta; no se conectan a ninguna entidad. Los objetivos miden el saldo de su cuenta de ahorro, no un fondo adicional.

## Datos de demostración

La demostración utiliza importes y entidades ficticios para mostrar cuentas, ahorro, inversión, deuda y planificación. No representa las finanzas de ninguna persona. Puedes restaurarla o empezar de cero desde Configuración.

Las reservas siguen formando parte de la deuda hasta que se pagan. La planificación es ilustrativa y puede mostrar déficit hasta que registres ingresos. Los meses anteriores a los saldos iniciales no se reconstruyen automáticamente.

## Persistencia y copias

Datos en SQLite local mediante Zentro.Api. `localStorage`, clave `zentro.v1`, conserva una copia; `zentro.v1.pending` protege los cambios pendientes si falla la API. Exporta JSON periódicamente desde Configuración; importarlo sustituye los datos tras confirmación y validación. CSV exporta movimientos, no una copia completa. No se guardan datos financieros en servidores remotos ni repositorios remotos.

Al empezar de cero, utiliza saldos iniciales que ya incluyan todos los intereses anteriores y registra solamente los nuevos abonos.

El estilo solicita fuentes de Google Fonts, con fuentes locales de respaldo. La aplicación funciona sin integración con servicios financieros. Arquitectura: `finance.ts` modelo y cálculos, `App.tsx` vistas y formularios, `storage.ts` cliente de la API, `style.css` presentación. El documento versionado v1 se guarda en una tabla SQLite del backend.
