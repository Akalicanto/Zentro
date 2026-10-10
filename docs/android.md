# Android

Zentro utiliza la misma aplicación React y API .NET en ordenador y Android. Es una **PWA**: se puede instalar desde Chrome y abrir desde su icono, en una ventana propia. No requiere mantener un proyecto Android o una segunda base de datos.

La navegación inferior da acceso a las cinco páginas. Las tablas anchas se desplazan horizontalmente dentro de su panel; formularios y controles se adaptan al espacio disponible. Se respetan las áreas seguras de la pantalla y las preferencias de movimiento reducido.

## Instalación en el Pixel

Cuando exista un servidor con HTTPS:

1. Abrir su dirección en Chrome del Pixel.
2. Pulsar **Instalar Zentro**, si Chrome ofrece el botón, o elegir **Instalar aplicación / Añadir a pantalla de inicio** en su menú.
3. Abrir Zentro desde el icono instalado.

El ordenador y el móvil utilizarán la misma URL y la misma base del servidor. `localhost` en el móvil se refiere al móvil, no al ordenador. Actualmente el proyecto sigue siendo local: no se ha contratado ni publicado un servidor.

## Preparar los archivos

Desde la raíz:

```powershell
npm.cmd run build
dotnet publish Zentro.Api -c Release -o checks/publish
```

El resultado incluye la API, el esquema SQL y `wwwroot` con React, manifiesto e iconos. El servidor debe proporcionar HTTPS, una ruta persistente y privada para SQLite mediante `Zentro__DatabasePath`, y copias de seguridad fuera del directorio público. No se publica la base local ni se incluye en Git.

Antes de exponer datos personales en internet hay que incorporar autenticación y control de concurrencia. Actualmente el guardado reemplaza el perfil completo: dos dispositivos editando a la vez pueden sobrescribirse. Esta preparación móvil no añade sincronización instantánea ni resuelve esos conflictos.

## Conexión y actualizaciones

El service worker guarda exclusivamente la interfaz estática. No almacena respuestas financieras de la API. Sin conexión, una recarga muestra el aviso existente de carga fallida; no inventa saldos ni sobrescribe la base. El mecanismo existente conserva una escritura fallida en el almacenamiento privado del navegador y la reintenta al recargar con conexión.

Una versión nueva muestra **Actualizar app**; la actualización se aplica al pulsarlo. Las funciones financieras siguen necesitando acceso a la API.
