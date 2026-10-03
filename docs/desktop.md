# Acceso de escritorio y base de datos

En Windows, `Zentro.lnk` abre una ventana de Firefox dedicada al proyecto, con el icono de Zentro y sin terminales visibles. Al cerrar esa ventana se apagan el front y la API. Si abres varias ventanas dentro de esa instancia, se apagan al cerrar la última. El arranque de desarrollo en VS Code conserva su comportamiento habitual.

Para crear o actualizar el acceso desde una copia del repositorio:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install-shortcut.ps1
```

Firefox debe estar instalado; `ZENTRO_FIREFOX_PATH` permite indicar otra ubicación. El perfil dedicado y los registros del arranque están en `%LOCALAPPDATA%\Zentro`, fuera del repositorio. Las escrituras pendientes del navegador se conservan para la próxima apertura. Si los puertos ya están ocupados, el acceso muestra un mensaje y no detiene el arranque existente.

El ejecutor utiliza [`--no-remote` y `--profile`](https://firefox-source-docs.mozilla.org/browser/CommandLineParameters.html) para abrir una instancia dedicada y [`--wait-for-browser`](https://wiki.mozilla.org/Platform/Integration/InjectEject/Launcher_Process/) para seguir su cierre en Windows.

## Ver la base

`Zentro.Api/Data/zentro.db` es la base SQLite privada: contiene tablas como `savings_months`, `investment_months`, `daily_expenses`, `daily_incomes` y `external_debts`. Los importes se guardan en céntimos. `profile_settings` conserva ajustes y saldos iniciales; `payload` contiene el registro JSON completo de cada fila.

SQLite gestiona los auxiliares `zentro.db-wal` y `zentro.db-shm`. Git ignora estos archivos y la base.

Abre `zentro.db` en VS Code con la extensión recomendada [SQLite Viewer](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer). Su visor gratuito permite consultar las tablas en modo lectura; se puede recargar para ver cambios. Si se abre como texto, usa **Abrir con… → SQLite Viewer**.
