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
├── docs/                            arquitectura, pruebas y originales del logo
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

**Día a día** conserva el saldo actual y movimientos mensuales de gastos e ingresos. Los previstos afectan a la previsión; realizarlos incorpora el importe al saldo una sola vez. Efectivo y posibles gastos se mantienen de forma independiente.

**Ahorros** incluye historial real, objetivos, previsiones, intereses registrados, distribución y deuda interna. Una retirada nueva reduce el ahorro y aumenta la deuda interna; una reposición hace lo inverso. Los pagos históricos ya incluidos no se contabilizan de nuevo. La distribución indica dónde está el dinero, con estimaciones netas de depósitos y cuentas remuneradas, sin añadir rendimientos futuros al patrimonio.

**Inversión** conserva las aportaciones y sus objetivos mensuales, sin incorporar rentabilidad variable. Comparte filtros, gráficos e historial con ahorro. Los meses sin registrar, los ceros y los valores negativos se distinguen.

**Deudas** mantiene calendarios de cuotas pagadas, apartadas o pendientes. Lo apartado todavía forma parte del importe por pagar. Estas deudas no modifican automáticamente el resto de las áreas.

El engranaje permite configurar el plan e importar o exportar copias JSON. Los botones de información explican los cálculos. Los historiales y calendarios destacan con color la fila del mes actual.

## Persistencia y Git

SQLite se crea en `Zentro.Api/Data/zentro.db`; `Zentro__DatabasePath` permite elegir otra ruta. La API guarda colecciones independientes y ajustes dentro de una transacción, con importes enteros en céntimos. El navegador conserva la última escritura pendiente si la API falla y la reintenta al recargar.

La API expone `GET /api/state`, `PUT /api/state` y `GET /api/health`. El perfil se guarda completo; evita editar simultáneamente en varias pestañas porque prevalece la última escritura. Front, API y Swagger funcionan en localhost; subir el código a GitHub no los publica como servicio.

`.gitignore` excluye bases SQLite y auxiliares, copias privadas, exportaciones, secretos y resultados de compilación. Los fixtures son ficticios y no se cargan en la aplicación. La [identidad visual](docs/brand/README.md) conserva los originales del logo; la interfaz solo sirve las versiones que utiliza.
