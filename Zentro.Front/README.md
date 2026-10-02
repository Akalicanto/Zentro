# Zentro.Front

React, TypeScript y Vite. Arranque conjunto y requisitos en el [README de la raíz](../README.md). El front utiliza el puerto 5187 y la API el 5080.

## Modelo

- `src/model.ts`: perfil v2, ahorro, inversión, intereses, día a día y deuda interna. Importes enteros en céntimos.
- `src/Dashboard.tsx`: cuatro páginas, tablas, formularios y gráficas de importes realizados y previstos.
- `src/profileStorage.ts`: carga desde SQLite mediante la API y cola ordenada de escrituras con pendientes conservados en el navegador.
- `src/format.ts`: fechas, meses, formato de euros y conversión decimal.

El ahorro por trabajo procede del historial mensual neto más reposiciones nuevas menos retiradas nuevas. Los intereses tienen saldo inicial y sus propios abonos. La inversión refleja aportaciones netas. Las reposiciones históricas no alteran de nuevo el ahorro: ya figuran en el historial. El patrimonio excluye saldo diario y efectivo.

Los pendientes de gastos e ingresos afectan solo a la previsión diaria. Realizarlos los incorpora una vez al saldo actual. Un nuevo saldo indicado incluye todo lo ya realizado y mantiene los pendientes.

Efectivo y posibles gastos son datos independientes: ninguno modifica el saldo diario, el ahorro, la inversión ni el patrimonio. Se guardan en SQLite y las copias de seguridad junto al perfil. Los perfiles anteriores sin estos campos siguen siendo válidos.

El plan genera previsiones de ahorro e inversión desde su inicio hasta el horizonte configurado. Las cuotas de reposición se limitan al compromiso pendiente, descuentan lo ya repuesto cada mes y desaparecen cuando la deuda se salda. Registrar la aportación base no elimina una reposición todavía pendiente de ese mes. Las previsiones no forman parte de los totales actuales.

## Comprobaciones

`npm.cmd test` ejecuta pruebas del modelo. `npm.cmd run build` compila. `node browser-profile-test.mjs` verifica la interfaz con API y SQLite temporales; requiere Chromium de Playwright y el front iniciado.

El perfil nuevo es vacío. Los datos ficticios de pruebas no están en la aplicación. Exportar e importar copias desde el engranaje conserva el perfil completo.
