# Copia mensual por correo desde el PC

Al abrir Zentro, y cada minuto mientras la ventana está visible, se comprueba la fecha en **Europe/Madrid**. Si es posterior al día 15 y todavía no hay un envío aceptado por SMTP ese mes, se muestra un diálogo. **Solo «Confirmar y enviar» crea y envía la copia mensual.** Si hay otro formulario abierto, se espera para no interrumpir la edición.

«Ahora no», la X o Escape aplazan la siguiente pregunta **24 horas completas**. La fecha se guarda en `%LOCALAPPDATA%\Zentro\mail-backups\reminder.json`, así que cerrar y reabrir no vuelve a preguntar antes. Al mostrar el diálogo ya se reserva el recordatorio: si se cierra la ventana sin responder, también se respetan las 24 horas. Solo una pestaña puede reservar el aviso. Si pasan meses sin abrir, se pregunta por la copia del mes actual, sin enviar copias de meses omitidos. El PC apagado o Zentro cerrado no envían ni muestran avisos.

En **Configuración → Copias de seguridad → Copia por correo**, «Enviar copia al correo ahora» envía directamente al pulsarlo. Funciona cualquier día, incluso antes del 16 o si ya se envió una copia ese mes. Un envío manual aceptado cuenta como la copia del mes actual y evita un recordatorio mensual innecesario; el botón permite enviar copias adicionales. Se muestra el destinatario y el resultado, y se bloquea el botón durante el envío.

El destinatario de la configuración inicial es el correo indicado al solicitar la función. Se introduce en la configuración privada del PC, fuera de Git. La cuenta remitente puede ser la misma.

## Configuración en este PC

1. Ejecuta `npm.cmd ci` en la raíz (o `npm.cmd run setup` si también necesitas preparar el resto de Zentro).
2. Ejecuta `npm.cmd run backup:configure` desde una consola privada. Confirma destinatario y remitente e introduce la credencial SMTP en el campo oculto. El configurador utiliza Gmail con TLS en el puerto 465 y comprueba la autenticación antes de activar las copias. Para Gmail necesitas una **contraseña de aplicación** de una cuenta que permita este acceso, no la contraseña habitual; consulta la [ayuda de Google](https://support.google.com/mail/answer/185833). No pegues la credencial en el chat ni la guardes en Git. La comprobación no envía ningún correo.
3. La configuración y el estado quedan en `%LOCALAPPDATA%\Zentro\mail-backups`. La credencial se cifra con DPAPI: solo tu usuario en este PC puede descifrarla. El directorio se restringe a tu usuario y SYSTEM. El script no requiere administrador ni instala tareas de Windows.
4. `npm.cmd run backup:check` muestra el estado en JSON, sin enviar ni reservar avisos. Para verificar la entrega real, usa el botón de Configuración o confirma el diálogo mensual. Comprueba tu bandeja y spam, descarga el adjunto y prueba su restauración.

El configurador usa Node y los cmdlets de almacenamiento de credenciales de Windows; no necesita habilitar archivos de scripts PowerShell. La ruta inicial respeta `Zentro__DatabasePath` si existe, o usa `Zentro.Api/Data/zentro.db`. Si cambias la ubicación de la base, actualiza `database` en la configuración privada. Para otro proveedor SMTP se pueden editar `smtpHost` y `smtpPort` (465 o 587) y guardar su credencial de Windows del mismo modo. Para suspender los envíos, cambia `enabled` a `false` en el `config.json` privado y reinicia Zentro.

## Archivo y correo

El correo incluye versiones HTML y texto, sin enlaces, fuentes remotas ni imágenes externas. Lleva un archivo **`.sqlite.gz` adjunto**, con la base completa comprimida mediante GZIP. No caduca ni depende de una descarga web. Se obtiene mediante la API de backup de SQLite para incluir escrituras confirmadas en WAL, y se comprueban integridad y claves foráneas antes del envío. El adjunto contiene los datos financieros; **no tiene contraseña ni cifrado del archivo**. La conexión de correo exige TLS. No incluye contraseñas de acceso ni la credencial SMTP.

Para recuperar los datos: extrae el GZIP con una herramienta compatible, cierra Zentro, conserva primero una copia de tu base actual y sus archivos auxiliares y coloca la SQLite extraída como `Zentro.Api/Data/zentro.db` (o en tu ruta personalizada). Evita mezclar el archivo restaurado con auxiliares `-wal` o `-shm` de otra base. Si no conoces el estado de esos auxiliares, conserva la restauración en otra ubicación y configura `Zentro__DatabasePath` para usarla.

Se conserva un registro `AAAA-MM.sent.json` **solo después de que SMTP acepte el correo**. Si falla, se muestra el error y se conservan la copia pendiente y su Message-ID. Puedes volver a confirmar el envío o cerrarlo para recordar en 24 horas; **no hay reintentos silenciosos por correo**. Las copias locales no se borran automáticamente. Una desconexión justo después de la aceptación SMTP y antes de guardar el registro puede producir un duplicado; no es posible garantizar entrega exactamente una vez mediante SMTP. Aceptación SMTP no garantiza llegada a la bandeja: hay que verificar la recepción real.

Los adjuntos mayores de 18 MB se conservan sin enviar y el diálogo muestra el fallo. No se sustituyen por enlaces. Los errores no impiden usar Zentro y no imprimen respuestas SMTP con información privada. La API debe estar activa para comprobar el estado y enviar.

El control usa `/api/backups` en la API local existente: **no abre puertos ni instala servicios nuevos**. Está disponible únicamente en desarrollo Windows y conexiones de loopback. Las acciones exigen la cabecera del cliente web y rechazan orígenes ajenos. La API ejecuta Node sin consola visible, comprueba que la base configurada sea la de esta instancia y no devuelve claves ni rutas privadas al navegador. La ruta de configuración alternativa `Zentro__MailBackupDirectory` permite pruebas aisladas; las pruebas no acceden a la configuración personal.

Esta función local es independiente de las [copias cifradas para el servidor Linux](hosting.md), cuya programación no se modifica.

## Verificación

`npm.cmd run test:backup` utiliza bases temporales y correo simulado. Comprueba el límite del día 15, recuperación de WAL, adjunto MIME, confirmación obligatoria, aplazamiento de 24 horas, persistencia mensual, reintentos explícitos, envío manual y dos aperturas simultáneas. `tests/integration/backup-api.test.mjs` verifica el puente local y sus restricciones sin credenciales reales; `tests/e2e/mailBackup.test.mjs` prueba diálogo, cancelación, recarga, errores y botón en Configuración con correo simulado. No se envían datos personales ni correos reales.
