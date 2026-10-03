# Zentro.Api

API ASP.NET Core con .NET 10, controladores, servicios y repositorio SQLite. La [arquitectura](../docs/architecture.md) explica las responsabilidades y el contrato financiero.

| Carpeta                      | Responsabilidad                             |
| ---------------------------- | ------------------------------------------- |
| `Controllers`                | Rutas, respuestas HTTP y documentación.     |
| `Models`                     | Contrato tipado del perfil y sus registros. |
| `Services`                   | Coordinación de validación y guardado.      |
| `Validation/Rules`           | Reglas financieras por área.                |
| `Infrastructure/Persistence` | Conexiones, esquema, transacciones y SQL.   |
| `Extensions`                 | Registro de dependencias.                   |
| `OpenApi`                    | Esquema del documento en Swagger.           |
| `Data`                       | Base local privada, excluida de Git.        |

## Desarrollo

Desde la raíz: `npm.cmd run dev` arranca también el front. Para arrancar solo la API: `npm.cmd run dev:api`. Swagger está en `http://127.0.0.1:5080/swagger` durante el desarrollo.

- `GET /api/state`: devuelve el perfil, o 204 si la base está vacía.
- `PUT /api/state`: valida y guarda el perfil completo; devuelve 204 o un problema de validación con estado 400.
- `GET /api/health`: comprueba el acceso a SQLite.

Importes: céntimos enteros. Tipos de interés: puntos básicos (100 = 1 %). Un importe mensual `null` representa un mes sin registrar. Los campos requeridos ausentes, importes decimales o inconsistencias entre deuda e historial se rechazan antes de escribir.

La base predeterminada es `Data/zentro.db`, relativa al directorio del proyecto. Se puede cambiar con `Zentro__DatabasePath`. No contiene credenciales ni necesita un servidor de base de datos adicional. Los cambios de colecciones y ajustes se guardan en una única transacción.

Para comprobar el backend: `npm.cmd test` desde la raíz compila la API y ejecuta la integración con una base temporal. No utiliza los datos personales.
