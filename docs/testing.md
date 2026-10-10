# Comprobaciones

Ejecutar desde la raíz, con Node.js 24 y el SDK .NET 10:

```powershell
npm.cmd run build
npm.cmd test
npx.cmd --prefix Zentro.Front playwright install chromium
npm.cmd run test:e2e
npm.cmd run format:check
```

## Qué verifica cada suite

Las pruebas de `money.test.ts` y `validationLimits.test.ts` cubren conversión y suma exacta de céntimos, límites de precisión diarios, horizonte de 600 meses, fechas límite e importaciones mal formadas. `profileStorage.test.ts` comprueba recuperación normalizada, fallos de conexión, escrituras posteriores y almacenamiento no disponible; `profileClient.test.ts` verifica los errores de validación de la API.

| Ubicación                                          | Cobertura                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Zentro.Front/tests/unit/financialProfile.test.ts` | Importes, saldos, meses, objetivos, previsiones, retiradas, reposiciones, distribución e intereses estimados.                                                |
| `tests/integration/api.test.mjs`                   | Contrato Swagger, documentos inválidos, coherencia de colecciones, transacciones y persistencia tras reiniciar la API.                                       |
| `Zentro.Front/tests/e2e/profile.test.mjs`          | Las cinco páginas, formularios, movimientos, gráficos, distribución, cuotas, recarga y móvil. Comprueba también que abrir un modal no redibuja los gráficos. |
| `Zentro.Front/tests/e2e/internalDebt.test.mjs`     | Edición, eliminación, redistribución y persistencia de deuda interna, incluida la presentación móvil.                                                        |

`tests/integration/migration.test.mjs`, ejecutado por la suite de API, comprueba ambos formatos antiguos, respaldo de datos en WAL, claves foráneas, columnas sin JSON, valores nulos/cero/negativos, reinicio sin repetir la migración y cancelación segura ante datos inválidos. La integración también fuerza un error SQL para comprobar que toda la escritura se revierte.

`Zentro.Front/tests/e2e/settingsChecks.mjs` se ejecuta dentro de la suite de navegador. Comprueba los cuatro saldos manuales, edición del plan y del tipo de interés, retorno a configuración, cancelación sin cambios, exportación/importación, persistencia, tema oscuro y ausencia de desbordamiento en móvil.

Los fixtures están en `Zentro.Front/tests/fixtures/`. Son sintéticos y no se importan desde `src/`.

La integración de API y la suite de navegador `profile.test.mjs` crean bases SQLite temporales y arrancan sus propias APIs en puertos libres. Las llamadas del navegador se redirigen a esas APIs. La suite `internalDebt.test.mjs` utiliza un perfil ficticio en memoria mediante interceptación HTTP para comprobar la edición y validación de la interfaz. Ninguna escribe en `Zentro.Api/Data/zentro.db`. Al terminar, detienen sus procesos y eliminan los datos temporales.

El ejecutor de navegador arranca Vite si no está disponible en el puerto 5187 y detiene únicamente el proceso que ha creado. Si el front ya estaba abierto, lo reutiliza. Los puertos de prueba de las APIs son independientes.

`npm.cmd run format` aplica Prettier al front, scripts, pruebas y documentación, y `dotnet format` al backend. `.editorconfig` define sangría y finales de línea; `.gitattributes` conserva LF en los archivos de texto y trata las imágenes como binarios.

Las estadísticas de deuda tienen pruebas en `Zentro.Front/tests/unit/debtAnalytics.test.ts`: porcentajes, cuotas apartadas aún pendientes, importes sin calendario, orden de meses y deuda vacía o saldada. La suite de navegador comprueba gráficos, filtro, actualización al cambiar una cuota y diseño sin desbordamiento en móvil.

`Zentro.Front/tests/unit/monthlyPlanning.test.ts` comprueba que el calendario financiero no repite aportaciones cerradas ni cuotas apartadas o pagadas, respeta objetivos por mes, limita reposiciones y no extiende el horizonte del plan. La suite de navegador verifica las vistas de 6 y 12 meses, las barras y la ausencia de desbordamiento en móvil; guarda capturas de claro, oscuro y móvil en `checks/`.

`Zentro.Front/tests/unit/dailyForecast.test.ts` verifica previsiones sin mes y normalización de copias anteriores. La integración comprueba la migración relacional 1 → 2, conservación de importes, ausencia de la columna `mes` y respuesta de interfaz/manifiesto desde la API.

`Zentro.Front/tests/e2e/android.test.mjs` usa Chromium con emulación Pixel y la compilación de producción en un puerto libre: manifiesto, iconos, service worker, navegación de las cinco páginas, ausencia de desbordamiento, tema oscuro, modal con fondo inmóvil y caché sin respuestas financieras. Comprueba el error de conexión sin sobrescribir datos. No sustituye una comprobación en el Pixel físico.

`externalDebts.test.ts` verifica cuotas exactas, colisiones de calendario, cierre, reapertura, archivo y exclusión del calendario financiero. `debtManagementChecks.mjs` prueba varias deudas, notas, historial, confirmación/cancelación, eliminación reversible, recuperación, persistencia en SQLite y recarga por ID, también en móvil. La integración valida notas, fechas de cierre y actividad, y comprueba migraciones desde las estructuras 1 y 2 a la versión 3 conservando importes.
