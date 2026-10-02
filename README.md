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

## Datos

La base de datos se crea automáticamente en `Zentro.Api/Data/zentro.db`. Guarda el documento financiero completo v1 en una tabla SQLite; el modelo y los cálculos existentes se conservan en `finance.ts`. Es una primera estructura para desarrollo local, de un único usuario. Las futuras entidades y operaciones de negocio se pueden extraer del documento a tablas y endpoints propios.

El front usa `/api/state` mediante el proxy de Vite. En la primera ejecución, si SQLite está vacía, migra la copia `zentro.v1` del navegador utilizado o carga la demostración original. Los cambios se escriben en orden en la API y los pendientes se conservan en el navegador si falla la conexión. Una vez inicializada, SQLite es la fuente de datos para los navegadores de este equipo. Evita editar simultáneamente en varias pestañas: esta primera versión guarda el documento completo y prevalece la última escritura.

Exporta copias JSON desde Configuración. No se suben datos financieros a GitHub. La base de datos, dependencias y archivos compilados quedan excluidos de Git. Para cambiar la ubicación de SQLite, configura `Zentro__DatabasePath` con una ruta absoluta.

Swagger está habilitado en Development. Ambos servicios escuchan solo en la dirección local. Esta configuración está preparada para desarrollar en este ordenador; todavía no incluye autenticación ni despliegue público.

La prueba de API usa una base temporal independiente y comprueba validación, Swagger y persistencia tras reiniciar. Para las comprobaciones de navegador, con los servicios arrancados:

```powershell
cd Zentro.Front
npx.cmd playwright install chromium
node browser-test.mjs
```

Las reglas financieras y la interpretación de los datos de demostración están documentadas en [Zentro.Front/README.md](Zentro.Front/README.md).
