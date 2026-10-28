"""SQLite -> gzip -> age -> SMTP TLS. Sin dependencias Python externas.

Solo las copias cifradas salen del directorio temporal privado. La clave de
descifrado no pertenece al servidor. Los envíos fallidos quedan para reintento.
"""
import argparse
from contextlib import closing
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import format_datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import smtplib
import sqlite3
import ssl
import subprocess
import tempfile
import uuid


def check_database(path):
    with closing(sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            raise RuntimeError('La copia no supera integrity_check.')
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise RuntimeError('La copia tiene relaciones inválidas.')


def snapshot(source, target):
    if not source.is_file():
        raise FileNotFoundError('No existe la base de datos de origen.')
    # Backup API incluye las escrituras confirmadas que sigan en el WAL.
    with closing(sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        with closing(sqlite3.connect(target)) as copy:
            db.backup(copy, pages=128, sleep=0.1)
    check_database(target)


def create_archive(config):
    outbox = Path(config['outbox'])
    outbox.mkdir(parents=True, exist_ok=True, mode=0o700)
    name = 'zentro-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    archive = outbox / (name + '.sqlite.gz.age')
    with tempfile.TemporaryDirectory(prefix='.work-', dir=outbox) as folder:
        folder = Path(folder)
        db = folder / 'snapshot.sqlite'
        snapshot(Path(config['database']), db)
        compressed = folder / 'snapshot.sqlite.gz'
        with db.open('rb') as source, gzip.open(compressed, 'wb') as target:
            shutil.copyfileobj(source, target)
        encrypted = folder / 'encrypted.age'
        subprocess.run([config.get('age_binary', 'age'), '-r', config['age_recipient'], '-o', str(encrypted), str(compressed)], check=True, capture_output=True, timeout=120)
        # Marcador primero: tras un corte, solo se envían archivos finalizados.
        archive.with_suffix(archive.suffix + '.pending').touch()
        encrypted.replace(archive)
    return archive


def send_archive(config, archive):
    if archive.stat().st_size > 18 * 1024 * 1024:
        raise RuntimeError('La copia supera el límite seguro para el adjunto de correo.')
    message = EmailMessage()
    message['From'] = config['smtp_from']
    message['To'] = config['recipient']
    message['Subject'] = 'Zentro · Copia de seguridad cifrada'
    message['Date'] = format_datetime(datetime.now(timezone.utc))
    # Un reintento conserva Message-ID; si SMTP aceptó pero se cortó la conexión
    # podría recibirse un duplicado. Nunca se descarta una copia sin aceptación.
    message['Message-ID'] = '<' + archive.stem + '@zentro.backup>'
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    message.set_content('Copia SQLite cifrada con age. Guarda tu clave privada fuera del servidor.\nSHA-256: ' + digest + '\n')
    message.add_attachment(archive.read_bytes(), maintype='application', subtype='octet-stream', filename=archive.name)
    password = Path(config['smtp_password_file']).read_text(encoding='utf-8').strip()
    tls = ssl.create_default_context()
    port = int(config.get('smtp_port', 465))
    if port == 465:
        connection = smtplib.SMTP_SSL(config['smtp_host'], port, timeout=45, context=tls)
    elif port == 587:
        connection = smtplib.SMTP(config['smtp_host'], port, timeout=45)
        try:
            connection.ehlo()
            connection.starttls(context=tls)
            connection.ehlo()
        except Exception:
            connection.close()
            raise
    else:
        raise ValueError('Solo se permiten SMTP TLS 465 o STARTTLS 587.')
    with connection:
        connection.login(config['smtp_user'], password)
        rejected = connection.send_message(message)
        if rejected:
            raise RuntimeError('SMTP ha rechazado el destinatario.')


def deliver_pending(config, sender=send_archive):
    outbox = Path(config['outbox'])
    for marker in sorted(outbox.glob('*.age.pending')):
        archive = marker.with_suffix('')
        if not archive.is_file():
            # Interrupción anterior a terminar el cifrado; no hay nada enviable.
            marker.unlink()
            continue
        sender(config, archive)
        archive.with_suffix(archive.suffix + '.sent').touch()
        marker.unlink()
        print('SMTP aceptó la copia cifrada: ' + archive.name)
    sent = sorted(outbox.glob('*.age.sent'), key=lambda marker: marker.stat().st_mtime_ns, reverse=True)
    for marker in sent[int(config.get('keep_sent', 24)):]:
        archive = marker.with_suffix('')
        if archive.with_suffix(archive.suffix + '.pending').exists():
            continue
        archive.unlink(missing_ok=True)
        marker.unlink()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='/etc/zentro/backup.json')
    parser.add_argument('--retry-only', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    config = json.loads(Path(args.config).read_text(encoding='utf-8'))
    # Un único proceso: timer y reintento no pueden enviar simultáneamente.
    import fcntl
    outbox = Path(config['outbox'])
    outbox.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (outbox / '.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if not args.retry_only:
            create_archive(config)
        deliver_pending(config)


if __name__ == '__main__':
    main()
