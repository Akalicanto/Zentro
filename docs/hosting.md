# Servidor privado de Zentro

PC y móvil usan la misma web HTTPS y la misma SQLite relacional del servidor. El PC puede estar apagado. En Android se instala desde el navegador como PWA; no hace falta publicar una app en Play Store. Los cambios se comprueban cada 15 segundos y al recuperar el foco. Si dos dispositivos editan una versión antigua, el segundo guardado se bloquea y permite descargar los cambios pendientes para recuperarlos.

## Coste y recursos

Oracle **Always Free**, Ubuntu 24.04 LTS ARM64, preferiblemente Ampere A1 con **2 OCPU / 12 GB** y disco de 50 GB, siempre que la consola confirme que todo entra en la cuota gratuita disponible. No crear recursos si aparecen cargos. La disponibilidad depende de la región; una cuenta nueva no garantiza capacidad. El ensayo promocional y Always Free son cosas distintas.

Una IP pública **reservada** permite conservar la dirección al sustituir la VM. Un subdominio gratuito de DuckDNS apunta a esa IP. Caddy obtiene y renueva el certificado HTTPS. Revisar el estimador de Oracle antes de crear la IP/VM; no cambiar a una cuenta de pago para resolver falta de capacidad sin decidirlo antes.

Oracle puede recuperar instancias gratuitas inactivas. Ni un DNS ni un cron evitan eso. Las copias enviadas fuera de Oracle son la recuperación: puede perderse lo introducido desde la última copia recibida, aproximadamente hasta 16 días. Si el servidor desaparece, tampoco puede enviar nuevas copias. El proveedor de infraestructura administra la máquina: esto no ofrece invisibilidad de los datos frente al proveedor; sí cifra las copias que salen por correo y restringe el acceso público a la app.

Fuentes: [Always Free y recuperación por inactividad](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [IP públicas](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm), [DuckDNS](https://www.duckdns.org/).

## Alta y red

1. Crear la cuenta en [Oracle Cloud](https://signup.cloud.oracle.com/) y activar MFA en ella. Los datos personales, tarjeta/verificación y códigos se introducen directamente allí.
2. Crear la VM gratuita con una clave SSH guardada fuera del repositorio. Reservar/asignar IP pública y anotar la región. Conservar la clave privada en el PC y gestor seguro, nunca en Git ni en el chat.
3. En las reglas de red de Oracle y el cortafuegos de Ubuntu permitir TCP **80 y 443** desde Internet. TCP **22**, solo desde la IP del administrador cuando sea posible. No publicar **5080**, SQLite ni Docker. No vaciar las reglas originales de Oracle ni habilitar un cortafuegos sin permitir primero la sesión SSH.
4. Crear un nombre en DuckDNS y apuntarlo a la IP reservada. Como la IP es fija, no hace falta un actualizador con token en la VM. Confirmar resolución DNS antes de pedir el certificado.
5. Clonar el código en `/opt/zentro` y ejecutar `sudo bash /opt/zentro/deployment/install-host.sh`. El instalador usa los repositorios oficiales de Docker y Caddy, prepara directorios y unidades, pero no activa la app ni los correos.

## Acceso y primer arranque

Ejecutar por SSH en un terminal privado:

```bash
sudo python3 /opt/zentro/deployment/configure-access.py
```

Elegir una contraseña única de al menos 16 caracteres y guardar la clave TOTP en un autenticador. Conservar además esa clave en el gestor de contraseñas: si se pierde el móvil, permite configurar de nuevo el autenticador. No hay registro ni recuperación pública por correo. Para cambiar contraseña/segundo factor, repetir el comando y reiniciar el contenedor: las sesiones anteriores dejan de ser válidas.

Los secretos quedan en `/etc/zentro/app.env`, permisos 600. Compose debe ser >= 2.30 para `env_file.format: raw`: el hash contiene `$` que deben conservarse literalmente. La API rechaza arrancar en producción sin contraseña y segundo factor. La cookie exige HTTPS, es HttpOnly/SameSite Strict y caduca en 12 horas; hay límite de intentos de acceso. Swagger solo existe en desarrollo.

Antes del primer arranque, **migrar la base existente**. Detener Zentro localmente y obtener una copia consistente, por ejemplo con `sqlite3.Connection.backup` (no copiar solo el `.db` de una app en ejecución con WAL). Transferirla mediante `scp`, fuera del repo, a `/var/lib/zentro/data/zentro.db`; asignar propietario `1654:1654` y permisos 600. No arrancar dos servidores de producción sobre una misma ruta compartida. Antes de sustituir datos existentes, guardar una copia y detener el contenedor.

```bash
cd /opt/zentro
sudo docker compose -f deployment/compose.yaml config --quiet
sudo docker compose -f deployment/compose.yaml up -d --build
curl --fail http://127.0.0.1:5080/api/health
```

Cambiar `zentro.example.invalid` en una **copia** de `deployment/Caddyfile` por el dominio elegido y guardarla en `/etc/caddy/Caddyfile`:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Abrir el dominio HTTPS: debe aparecer el acceso. Sin sesión, `/api/state` debe devolver 401. Después de entrar, comprobar importes y editar un dato de prueba que pueda deshacerse. Probar PC y móvil; ambos deben consultar la misma URL. No usar el acceso directo local para editar otra base en paralelo.

## Copias por correo: configuración y verificación

La copia usa la [API de backup de SQLite](https://www.sqlite.org/backup.html), verifica integridad y relaciones, comprime y cifra con [age](https://github.com/FiloSottile/age). **La clave privada no debe residir en Oracle ni enviarse con las copias.**

1. En el PC, con age instalado, ejecutar `age-keygen -o zentro-recuperacion.agekey`. Guardar ese archivo en un gestor seguro y una segunda ubicación independiente del servidor. Anotar la clave pública `age1…` que muestra el comando.
2. Copiar `deployment/backup.example.json` a `/etc/zentro/backup.json`, permisos 600. Poner la clave **pública**, destinatario real y cuenta SMTP del remitente. La dirección del usuario solo se escribe en esta configuración privada.
3. Guardar la credencial SMTP en `/etc/zentro/smtp.password`, permisos 600. Se admiten SSL 465 o STARTTLS 587 con verificación de certificados. Para Gmail, [contraseña de aplicación y verificación en dos pasos](https://support.google.com/mail/answer/185833). El correo de recuperación puede ser el mismo que el remitente. No se presupone que Oracle Email Delivery esté disponible gratis.
4. Ejecutar `sudo systemctl start zentro-backup.service` y verificar `sudo journalctl -u zentro-backup.service`. Comprobar que el correo llega también fuera de spam y descargar el adjunto.
5. En el PC, probar la restauración hacia un archivo **nuevo**:

```bash
python deployment/restore.py zentro-COPIA.sqlite.gz.age --identity RUTA/zentro-recuperacion.agekey --output RUTA/zentro-restaurada.sqlite
```

La restauración comprueba integridad y claves foráneas, y se niega a sobrescribir archivos. La copia solo contiene los datos financieros, no contraseñas de acceso ni claves de sesión: en un servidor nuevo se configura un acceso nuevo y se invalida el anterior. Conservar la clave privada de age es imprescindible; sin ella el adjunto no es recuperable.

**Solo tras recibir y restaurar la primera copia**, activar:

```bash
sudo systemctl enable --now zentro-backup.timer zentro-backup-retry.timer
systemctl list-timers 'zentro-backup*'
```

El [timer persistente de systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html) ejecuta las copias los días **1 y 16 a las 03:00, Europe/Madrid**. Si estaba apagado, recupera una ejecución al arrancar. Un segundo timer reintenta correos pendientes cada día a las 04:00 sin crear otra copia. Se guardan las últimas 24 copias ya aceptadas por SMTP y todas las pendientes; un fallo no borra una copia sin enviar. SMTP aceptado no garantiza recepción: revisar los correos recibidos y el estado de los timers periódicamente. Un corte justo después de enviar puede causar un duplicado, que es preferible a perder una copia.

## Operación y recuperación

- Actualizar: crear primero una copia, `git pull --ff-only`, reconstruir con Compose y comprobar salud/acceso. Las actualizaciones del contenedor son explícitas; Ubuntu tiene actualizaciones de seguridad automáticas. Revisar también Docker, Caddy y .NET periódicamente.
- Parar: `sudo docker compose -f /opt/zentro/deployment/compose.yaml stop`. No usar `down -v` ni borrar `/var/lib/zentro`.
- Recuperar: VM nueva, acceso nuevo, restaurar adjunto en PC, transferir la SQLite validada por SSH con el contenedor parado, asignar permisos, arrancar y reasignar la IP/DNS. Configurar nuevamente SMTP y probar otra copia.
- Logs: `sudo docker compose -f /opt/zentro/deployment/compose.yaml logs --tail 100`, `sudo journalctl -u caddy -u zentro-backup.service`. Nunca pegar secretos ni exportaciones financieras en incidencias públicas.

## Alcance de las comprobaciones locales

`tests/integration/access.test.mjs` prueba autenticación real, sesiones, CSRF y conflictos ETag contra una SQLite temporal. `deployment/test_backup.py` prueba copia con WAL activo, cifrado/descifrado real y reintento tras un fallo SMTP simulado. La construcción Docker, red de Oracle, certificado HTTPS y entrega real de correo requieren la VM y las cuentas; no quedan verificados por las pruebas locales.
