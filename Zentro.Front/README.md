# Zentro.Front

React, TypeScript y Vite. Requisitos y arranque conjunto en la [guía de inicio](../docs/getting-started.md).

## Organización

- `src/app`: componente raíz, navegación y estructura de sidebar/navbar.
- `src/features`: páginas, formularios, hooks y servicios agrupados por área. `history` comparte gráficos e historial entre ahorro e inversión; `profile` coordina edición y persistencia.
- `src/domain`: contrato del perfil, validación, aportaciones, totales, distribución y operaciones de deuda interna. No depende de React ni del navegador.
- `src/shared`: componentes comunes, transporte HTTP y utilidades de fechas/importes.
- `src/styles`: CSS por responsabilidad, importado en orden desde `index.css`.
- `tests`: datos ficticios, pruebas del dominio y flujos de navegador.

La [guía de arquitectura](../docs/architecture.md) documenta las dependencias y las reglas financieras. Los componentes reciben datos y acciones mediante props; los hooks de perfil centralizan el guardado y la edición. Cada formulario tiene un tipo explícito de acción y registro.

## Desarrollo

Desde la raíz: `npm.cmd run dev` inicia front y API. Para iniciar solo el front: `npm.cmd run dev:front`. Vite escucha en `127.0.0.1:5187` y dirige `/api` a la API local en el puerto 5080.

Desde esta carpeta:

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run format
npm.cmd run format:check
```

Las pruebas de navegador se ejecutan desde la raíz con `npm.cmd run test:e2e`, que prepara Vite y utiliza APIs y bases temporales. Ver [comprobaciones](../docs/testing.md).

El perfil inicial está vacío. La persistencia usa SQLite mediante HTTP; la última escritura pendiente queda conservada en el navegador si la API falla. Los fixtures nunca se importan desde `src/`.
