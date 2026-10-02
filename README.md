# Zentro

Repositorio con **Zentro.Front** (React, TypeScript y Vite) y **Zentro.Api** (.NET 10 y SQLite).

## Arrancar desde VS Code

Abre esta carpeta raíz. En **Ejecutar y depurar** selecciona **Zentro: Front + API + Swagger** y pulsa **▶** o **F5**. Arranca ambos servicios con recarga automática y abre el front y Swagger en el navegador cuando están listos.

- Front: http://127.0.0.1:5187
- Swagger: http://127.0.0.1:5080/swagger
- API: http://127.0.0.1:5080/api/health

**Ctrl+C** en la terminal o **Stop / Shift+F5** detiene los dos servicios. Los puertos son fijos; si están ocupados, el arranque falla sin detener otros programas. También puedes hacer doble clic en `Iniciar-Zentro.cmd` o ejecutar `npm.cmd run dev` desde la raíz.

El perfil **Zentro.Api: depurar C#** permite poner puntos de interrupción en el backend. Úsalo con el arranque conjunto detenido y ejecuta el front por separado con `npm.cmd run dev:front`.

## Instalación y comprobaciones

Requisitos: Git, Node.js 24 LTS, SDK .NET 10 y VS Code. En este ordenador ya están instalados junto con las extensiones C# y C# Dev Kit.

```powershell
npm.cmd run setup   # instala el front y restaura NuGet
npm.cmd run build   # compila front y API
npm.cmd test        # modelo financiero y API con SQLite temporal
```

Si una terminal abierta antes de la instalación no encuentra las herramientas, abre una nueva.

## Estructura

```text
Zentro/
  Zentro.Front/        interfaz, modelo financiero y cliente de persistencia
  Zentro.Api/          API .NET 10
    Data/             repositorio SQLite y validación del documento
    Properties/       perfil de desarrollo en el puerto 5080
  .vscode/            arranque, tareas y extensiones recomendadas
  scripts/            arranque conjunto y prueba de integración de la API
  Zentro.slnx          solución .NET
  global.json         SDK .NET 10
```

## Datos y páginas

El sidebar tiene Mi espacio, Día a día, Ahorros, Inversión y Deudas. Mi espacio reúne patrimonio, disponibilidad diaria, efectivo, ahorro por trabajo, intereses, inversión y una oferta hipotecaria editable. Patrimonio = ahorro por trabajo + intereses + capital invertido; excluye el día a día, el efectivo y la oferta hipotecaria. La inversión refleja aportaciones, sin rentabilidad variable. Sus gráficos comparan aportaciones reales, objetivos mensuales registrados y previsiones; el objetivo puede cambiar cada mes.

Deudas muestra el tratamiento del dentista y un calendario editable. Cada cuota está pagada, apartada (dinero preparado aún no abonado) o pendiente. Falta por pagar = deuda total − cuotas realmente pagadas; incluye el dinero apartado. El calendario agrupa los meses por año y permite añadir, editar, cambiar el estado y eliminar cuotas. Se guarda en `external_debts` y su seguimiento no modifica el saldo diario, el ahorro, la inversión ni la deuda interna. Los meses sin planificar siguen contando en el importe restante.

Día a día permite indicar el saldo actual y añadir, editar, eliminar o realizar gastos e ingresos mensuales. Los pendientes modifican la previsión. Al realizarlos, pasan al saldo actual sin duplicarse. Indicar un nuevo saldo incluye los movimientos realizados anteriores y mantiene pendientes los futuros.

Efectivo se actualiza de forma independiente y no participa en los cálculos financieros. Posibles gastos es una lista editable sin mes ni cuenta: conserva conceptos e importes estimados sin descontarlos del saldo ni del patrimonio. La lista se persiste en `possible_expenses` y el efectivo en `profile_settings`. Las tablas tienen edición general y el mes diario empieza en el mes actual.

Ahorros separa el historial de trabajo, los intereses generados y la deuda interna. Una retirada nueva reduce el ahorro y aumenta la deuda. Reponerlo aumenta el ahorro y reduce la deuda. Los pagos históricos ya incluidos en el ahorro no se suman otra vez. La previsión añade la aportación base y las reposiciones pendientes, limitadas a la deuda existente. Inversión tiene su propia tabla y gráfica. Vacío, cero y valores negativos se conservan por separado.

Distribución de ahorros permite añadir y editar depósitos y cuentas remuneradas: capital, TIN/TAE, plazo, fecha inicial y retención estimada. Un destino puede tomar automáticamente el capital restante. Los gráficos muestran ubicación e intereses netos estimados; estos intereses futuros no se añaden al patrimonio. Mi espacio también recoge la distribución. La cuenta admite un mes equivalente o días reales/360, el método publicado por [Trade Republic](https://support.traderepublic.com/es-es/1533-What-do-I-need-to-know-about-interest). La retención inicial editable es del 19 % conforme al [artículo 90 del Reglamento del IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a90); representa una estimación, no la liquidación final. Una nueva base no contiene destinos ni importes de ejemplo.

Los historiales, movimientos diarios y calendarios destacan el mes actual. El sidebar se contrae desde una pestaña integrada y cambia del logo completo al símbolo. La identidad y sus versiones para favicon están en [`public/brand`](Zentro.Front/public/brand/README.md).

El engranaje del encabezado permite configurar el plan mensual y exportar o importar copias JSON. Una base nueva empieza vacía y no carga ejemplos. Los botones de información aparecen en la esquina inferior derecha de los bloques y muestran sus explicaciones al pulsarlos. La oferta hipotecaria se guarda en `profile_settings` y no modifica saldos, deuda ni patrimonio.

SQLite se crea en `Zentro.Api/Data/zentro.db`. El perfil v2 guarda colecciones independientes en `savings_months`, `investment_months`, `savings_placements`, `interest_entries`, `daily_expenses`, `daily_incomes`, `internal_debt_items`, `internal_debt_payments`, `internal_debt_schedule` y `commitments`. `profile_settings` contiene saldos iniciales y preferencias. Lectura y escritura del perfil son transacciones; los importes se guardan en céntimos. No hay entidades de cuentas en el modelo actual.

La API expone `/api/state` (GET y PUT) y `/api/health`, documentadas en Swagger. El navegador conserva pendientes en `zentro.v3.pending` si falla la API. Evita editar simultáneamente en varias pestañas: se guarda el perfil completo y prevalece la última escritura. Para cambiar la ruta de SQLite configura `Zentro__DatabasePath`.

Las bases de datos, copias y archivos privados están excluidos de Git. Los datos financieros no se incorporan al código ni a los ejemplos de pruebas. El proyecto está preparado para uso local, sin conexiones bancarias ni despliegue público.

## Verificación

`npm.cmd test` verifica el modelo y la API con SQLite temporal, incluyendo persistencia y las tablas independientes. Con el front arrancado y el backend compilado:

```powershell
cd Zentro.Front
npx.cmd playwright install chromium
node browser-profile-test.mjs
```

La prueba de navegador utiliza su propia API y base temporal: comprueba las cinco páginas, gastos/ingresos, retiradas/reposiciones, intereses, inversión, distribución editable, cuotas del dentista, recarga y móvil sin modificar datos del usuario. También verifica que abrir el modal de distribución no redibuje los gráficos. Sus fixtures están en `Zentro.Front/tests/profile.ts` y no se cargan en la aplicación.
