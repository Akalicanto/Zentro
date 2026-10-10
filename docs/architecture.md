# Arquitectura

Zentro es una aplicación local. React consume la API .NET; SQLite conserva el perfil financiero. No se cargan datos de demostración al arrancar.

## Backend

```text
HTTP → Controller → ProfileService → ProfileValidator
                                  → IProfileRepository → SQLite
```

- `Program.cs` configura el servidor y registra las dependencias mediante `Extensions/ServiceCollectionExtensions.cs`.
- `Controllers/` contiene rutas, códigos HTTP y documentación Swagger. No contiene SQL ni reglas financieras.
- `Models/` define el contrato v2 con tipos explícitos. Los importes son enteros en céntimos y los tipos de interés son puntos básicos.
- `Services/` coordina validación y persistencia a través de interfaces. Un documento inválido nunca llega al repositorio.
- `Validation/Rules/` separa las reglas de movimientos diarios, aportaciones, intereses, destinos, deudas y plan. `ProfileValidator` comprueba después la coherencia entre colecciones y los saldos agregados.
- `Infrastructure/Persistence/` concentra conexión, esquema y consultas. `Schema/` contiene las migraciones SQL, `Stores/` los mapeos explícitos entre modelos y columnas españolas. Los valores SQL se parametrizan.
- `OpenApi/` describe el contrato del documento en Swagger, sin cargar datos privados.
- `Data/` contiene únicamente la base privada, excluida de Git.

Cada operación abre y libera su conexión. Leer el perfil usa una transacción para obtener una instantánea coherente. Guardarlo sustituye las colecciones y sus ajustes dentro de una única transacción. El acceso es síncrono: SQLite realiza estas operaciones localmente y no necesita una capa de tareas artificiales.

El repositorio lee y escribe modelos tipados sobre 18 tablas relacionales, con claves foráneas y restricciones. No guarda documentos JSON. `JsonRequired` diferencia un campo ausente de un importe `null`; este último representa un mes sin registrar. Los campos opcionales de versiones anteriores pueden omitirse; los campos desconocidos se rechazan para evitar pérdidas silenciosas. `LegacyProfileReader` se utiliza exclusivamente durante la migración inicial y las tablas antiguas desaparecen al completarla. La [guía de base de datos](database.md) describe las tablas, vistas, relaciones y copias privadas.

## Frontend

```text
app/ → features/ → domain/
                 → shared/
```

- `app/` reúne las páginas, navegación y estructura visual. `App.tsx` conecta los hooks de perfil y edición con las páginas.
- `features/` agrupa cada área: perfil, día a día, ahorros, inversión, deuda interna y deudas externas. Sus componentes, formularios y hooks permanecen junto a la funcionalidad correspondiente.
- `features/history/` comparte filtros, gráficos e historial mensual entre ahorro e inversión.
- `features/profile/components/SettingsPanel.tsx` reúne los valores manuales. Reutiliza los formularios de saldo, plan y destino; el editor recuerda cuándo debe volver a configuración al cerrar. No modifica totales calculados ni crea registros mensuales.
- `features/profile/hooks/` controla el estado y los formularios; `forms/applyProfileForm.ts` transforma sus entradas sin depender de la interfaz.
- `features/profile/services/profileStorage.ts` ordena las escrituras y conserva la última pendiente en el navegador si falla la API. Una recarga intenta guardarla antes de cargar la base.
- `domain/` define tipos, cálculos, validación y operaciones financieras. No importa React, no hace llamadas HTTP y no lee almacenamiento.
- `shared/api/` contiene el transporte HTTP; `shared/utils/`, las funciones de fechas, importes e identificadores; `shared/components/`, elementos visuales compartidos.
- `styles/` separa base, navegación, componentes y áreas. `index.css` fija el orden de la cascada; cambiar ese orden puede modificar la apariencia.

Los gráficos se memoizan para evitar redibujarlos al abrir formularios. Las clases visuales y la paleta se conservan durante esta reorganización. Los formularios usan una unión discriminada (`ProfileModal`), de modo que cada acción recibe el tipo correcto de registro.

## Reglas que deben conservarse

- Patrimonio = ahorro por trabajo + intereses registrados + capital invertido. El saldo diario, el efectivo y la oferta hipotecaria quedan fuera de esta suma.
- El ahorro neto de un mes incluye su aportación, reposiciones nuevas y retiradas nuevas. Los pagos históricos ya incluidos no se suman otra vez.
- Vacío, cero y valores negativos son situaciones distintas. Las previsiones no forman parte del patrimonio actual.
- Los gastos e ingresos diarios no tienen mes asociado y son siempre previsiones: crean, editan o eliminan importes pendientes sin modificar el saldo actual manual. Los estados antiguos se conservan únicamente por compatibilidad con perfiles anteriores.
- La distribución indica dónde está el ahorro, sin crear aportaciones ni cobrar intereses estimados.
- Las cuotas apartadas del dentista siguen pendientes de pago. Las deudas externas no modifican automáticamente otras áreas.
- Efectivo y posibles gastos se conservan como datos independientes.

## Añadir una funcionalidad

1. Definir el contrato en `domain/types.ts` y `Models/`, manteniendo compatibilidad con perfiles anteriores cuando corresponda.
2. Implementar los cálculos en `domain/` y las reglas del servidor en `Validation/Rules/`.
3. Crear una nueva migración SQL versionada y un mapeo en `Infrastructure/Persistence/Stores/` si requiere persistencia; incluirlo en el repositorio y comprobar la migración desde la versión anterior.
4. Crear los componentes y hooks en su carpeta de `features/`; conectarlos desde `app/`.
5. Verificar la regla financiera con datos ficticios y, si cambia un flujo, añadir una comprobación de navegador. Nunca convertir datos personales en fixtures.

Las rutas siguen siendo `GET /api/state`, `PUT /api/state` y `GET /api/health`. El contrato guarda el perfil completo: dos pestañas que editan simultáneamente pueden sobrescribirse; prevalece la última escritura.

## Modales y Android

`shared/components/ModalFrame.tsx` centraliza el portal del modal, bloqueo del scroll de fondo, foco, teclado y restauración al cerrar. Todos los editores lo reutilizan. El modal hereda el tema y permite desplazar solo su contenido.

`shared/components/PwaStatus.tsx` ofrece instalación, estado de conexión y actualización voluntaria. Vite genera el manifiesto y el service worker. Solo se precargan archivos estáticos; las respuestas `/api` no se almacenan en esa caché. `styles/mobile.css` reúne navegación inferior, áreas seguras y ajustes táctiles.

La API sirve `wwwroot` desde el directorio de salida, donde MSBuild copia la compilación React. Los activos se sirven mediante `UseStaticFiles`; el manifiesto de activos estáticos del SDK se desactiva porque los archivos proceden de Vite. Ejecuta la compilación del front antes de publicar .NET. Más detalles en [Android](android.md).

## Gestión de deudas

`DebtsPage` coordina la vista general, filtros de activas/completadas/eliminadas, detalle y selección por ID. `DebtNavigation` ofrece un desplegable por deuda activa. La URL conserva la deuda y la pestaña para recargar directamente su ficha. `DebtDetail` reutiliza calendario y gráficos, `DebtEditor` gestiona creación, datos, planificación y confirmaciones. `domain/externalDebts.ts` aplica cierre, reapertura, archivo, recuperación y reparto exacto en céntimos. Completar registra cuotas pagadas únicamente en la deuda; no modifica los otros saldos.
