"""Descifra a un archivo NUEVO. Nunca sobreescribe una base de datos existente."""
import argparse
import gzip
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from backup import check_database


def restore(archive, identity, destination, age_binary='age'):
    if destination.exists():
        raise FileExistsError('El destino ya existe. Elige otro archivo.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.restore-', dir=destination.parent) as folder:
        compressed = Path(folder) / 'snapshot.gz'
        subprocess.run([age_binary, '-d', '-i', str(identity), '-o', str(compressed), str(archive)], check=True, capture_output=True, timeout=120)
        restored = Path(folder) / 'restored.sqlite'
        with gzip.open(compressed, 'rb') as source, restored.open('wb') as target:
            shutil.copyfileobj(source, target)
        check_database(restored)
        # link falla si alguien crea el destino mientras desciframos.
        os.link(restored, destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--identity', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    restore(args.archive, args.identity, args.output)
    print('Copia restaurada y verificada. La base activa no se ha modificado.')
