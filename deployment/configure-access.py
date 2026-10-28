"""Ejecutar en el servidor por SSH, como root. Nunca imprime la contraseña."""
import base64
import getpass
import hashlib
import os
from pathlib import Path
import secrets
from urllib.parse import quote


def main():
    os.umask(0o077)
    target = Path('/etc/zentro/app.env')
    if target.exists():
        if input('Cambiar acceso y cerrar las sesiones existentes? Escribe CAMBIAR: ') != 'CAMBIAR':
            raise SystemExit('Cancelado.')
    password = getpass.getpass('Nueva contraseña (mínimo 16 caracteres): ')
    if len(password) < 16 or len(password) > 1024:
        raise SystemExit('La contraseña debe tener entre 16 y 1024 caracteres.')
    if password != getpass.getpass('Repite la contraseña: '):
        raise SystemExit('No coinciden.')
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600000)
    value = 'pbkdf2-sha256$600000$' + base64.b64encode(salt).decode() + '$' + base64.b64encode(digest).decode()
    totp = base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Compose raw evita interpretar los $ del hash como variables.
    target.write_text('Zentro__Authentication__PasswordHash=' + value + '\nZentro__Authentication__TotpSecret=' + totp + '\n', encoding='utf-8')
    target.chmod(0o600)
    print('Guarda esta clave en tu autenticador y en tu gestor de contraseñas:')
    print(totp)
    print('URI de configuración (secreto, no compartir):')
    print('otpauth://totp/' + quote('Zentro:perfil') + '?secret=' + totp + '&issuer=Zentro&digits=6&period=30')
    print('Acceso guardado en /etc/zentro/app.env. Reinicia el contenedor para aplicarlo.')


if __name__ == '__main__':
    main()
