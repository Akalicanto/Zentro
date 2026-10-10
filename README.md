# Zentro

Aplicación de finanzas personales para uso local: **React + TypeScript + Vite** en `Zentro.Front`, **ASP.NET Core .NET 10 + SQLite** en `Zentro.Api`. Una instalación nueva empieza vacía; los datos personales permanecen en la base local.

## Arrancar

Requisitos: Git, Node.js 24, SDK .NET 10 y VS Code con C# Dev Kit.

```powershell
npm.cmd run setup
npm.cmd run dev
```

En VS Code, abre esta carpeta raíz y elige **Zentro: Front + API + Swagger** en Ejecutar y depurar. **F5** arranca ambos servicios con recarga automática y abre front y Swagger. **Shift+F5** o **Ctrl+C** los detiene. También puedes usar `Iniciar-Zentro.cmd`.

| Servicio local  | Dirección                        |
| --------------- | -------------------------------- |
| Interfaz        | http://127.0.0.1:5187            |
| Swagger         | http://127.0.0.1:5080/swagger    |
| Salud de la API | http://127.0.0.1:5080/api/health |

Los puertos son fijos. Si están ocupados, el arranque falla sin detener otros programas. El perfil **Zentro.Api: depurar C#** permite poner puntos de interrupción; úsalo con el arranque conjunto detenido y `npm.cmd run dev:front` por separado.

## Estructura

El [acceso de escritorio](docs/desktop.md) abre el proyecto en Firefox y apaga los servicios al cerrar su ventana.

```text
Zentro/
├── Zentro.Api/
│   ├── Controllers/                 rutas y respuestas HTTP
│   ├── Models/                      contrato financiero tipado
│   ├── Services/                    coordinación de operaciones
│   ├── Validation/Rules/            reglas por área
│   ├── Infrastructure/Persistence/  SQLite, esquema y repositorio
│   ├── Extensions/                  registro de dependencias
│   ├── OpenApi/                     documentación Swagger
│   └── Data/                        base privada, ignorada por Git
├── Zentro.Front/
│   ├── src/app/                     navegación y estructura visual
│   ├── src/features/                páginas, hooks y formularios por área
│   ├── src/domain/                  tipos y cálculos sin React
│   ├── src/shared/                  componentes, utilidades y HTTP
│   ├── src/styles/                  estilos separados por responsabilidad
│   ├── public/                      recursos utilizados por la interfaz
│   └── tests/                       fixtures, unidades y navegador
├── tests/integration/               pruebas de API y persistencia
├── scripts/                         arranque y ejecución de pruebas
├── docs/                            arquitectura, pruebas, Android e identidad
└── .vscode/                         tareas y depuración conjunta
```

La [guía de arquitectura](docs/architecture.md) explica cada capa, las dependencias y cómo ampliar el proyecto. Hay instrucciones específicas para el [frontend](Zentro.Front/README.md) y la [API](Zentro.Api/README.md).

## Comprobar y dar formato

```powershell
npm.cmd run build         # compila ambos proyectos
npm.cmd test              # cálculos y API con SQLite temporal
npm.cmd run test:e2e      # interfaz, recarga y móvil con datos ficticios
npm.cmd run format        # Prettier y dotnet format
npm.cmd run format:check  # verifica el formato sin modificar archivos
```

La primera vez que ejecutes las pruebas de navegador, instala Chromium con `npx.cmd --prefix Zentro.Front playwright install chromium`. Los detalles de aislamiento y cobertura están en [docs/testing.md](docs/testing.md). Las pruebas no escriben en la base del usuario.

## Datos y funciones

**Mi espacio** reúne patrimonio, disponibilidad diaria, efectivo, ahorro por trabajo, intereses, capital invertido y una oferta hipotecaria editable. Patrimonio = ahorro + intereses registrados + capital invertido. El saldo diario, el efectivo y la oferta hipotecaria no forman parte de esa suma.

Incluye un calendario financiero de 6 o 12 meses que reúne las aportaciones pendientes de ahorro e inversión, las reposiciones internas y las cuotas de deudas por preparar. Muestra el total mensual, lo ya apartado y el mes con mayor esfuerzo. Las aportaciones registradas se consideran cerradas; el calendario no altera saldos y solo proyecta aportaciones dentro del horizonte del plan.

**Día a día** conserva el saldo actual y una lista de gastos e ingresos previstos sin asociación a meses. El mes de la cabecera es solo una referencia de la fecha actual. Todos los gastos e ingresos son previsiones, sin selector de estado. Crear, editar o borrar registros recalcula el saldo previsto; el saldo actual se introduce manualmente. Efectivo y posibles gastos se mantienen de forma independiente.

**Ahorros** incluye historial real, objetivos, previsiones, intereses registrados, distribución y deuda interna. Una retirada nueva reduce el ahorro y aumenta la deuda interna; una reposición hace lo inverso. Los pagos históricos ya incluidos no se contabilizan de nuevo. La distribución indica dónde está el dinero, con estimaciones netas de depósitos y cuentas remuneradas, sin añadir rendimientos futuros al patrimonio.

**Inversión** conserva las aportaciones y sus objetivos mensuales, sin incorporar rentabilidad variable. Comparte filtros, gráficos e historial con ahorro. Los meses sin registrar, los ceros y los valores negativos se distinguen.

**Deudas** mantiene calendarios de cuotas pagadas, apartadas o pendientes. Incluye un gráfico del reparto de la deuda, barras de cuotas por mes con filtro de año, progreso pagado/preparado, número de cuotas por pagar, primera cuota pendiente y final del calendario. Los importes sin mes asignado se muestran aparte. Lo apartado todavía forma parte del importe por pagar. Estas deudas no modifican automáticamente el resto de las áreas.

El engranaje abre **Configuración**: permite actualizar saldo actual de ING, efectivo, intereses acumulados y oferta hipotecaria; ajustar el plan mensual; y editar capital, interés, retención y plazo de los destinos del ahorro. Guardar o cancelar una edición devuelve al panel. Las copias JSON están en una sección desplegable. Los historiales mensuales se editan desde sus páginas y los totales calculados no se modifican directamente. Los botones de información explican los cálculos. Los historiales y calendarios destacan con color la fila del mes actual.

## Android

La misma interfaz es una PWA instalable, con navegación inferior, controles táctiles y formularios adaptados. Consulta [Android y publicación](docs/android.md). La compilación incluye interfaz y API en una sola aplicación; no hay una segunda base móvil. Todavía no está alojada en internet.

## Persistencia y Git

SQLite se crea en `Zentro.Api/Data/zentro.db`; `Zentro__DatabasePath` permite elegir otra ruta. La API guarda 17 tablas relacionales con columnas en español, claves foráneas e importes enteros en céntimos, dentro de una transacción. No almacena documentos JSON en columnas. La [guía de base de datos](docs/database.md) explica tablas, vistas en euros y migración con respaldo privado. El navegador conserva la última escritura pendiente si la API falla y la reintenta al recargar.

La API expone `GET /api/state`, `PUT /api/state` y `GET /api/health`. El perfil se guarda completo; evita editar simultáneamente en varias pestañas porque prevalece la última escritura. Front, API y Swagger funcionan en localhost; subir el código a GitHub no los publica como servicio.

`.gitignore` excluye bases SQLite y auxiliares, copias privadas, exportaciones, secretos y resultados de compilación. Los fixtures son ficticios y no se cargan en la aplicación. La [identidad visual](docs/brand/README.md) conserva los originales del logo; la interfaz solo sirve las versiones que utiliza.
