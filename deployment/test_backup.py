"""Pruebas aisladas. AGE_BINARY y AGE_KEYGEN permiten usar binarios portables."""
from contextlib import closing
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from backup import create_archive, deliver_pending, snapshot
from restore import restore


class BackupTests(unittest.TestCase):
    def test_wal_encrypt_restore_and_retry(self):
        with tempfile.TemporaryDirectory(prefix='zentro-backup-test-') as folder:
            folder = Path(folder)
            age = os.environ.get('AGE_BINARY', 'age')
            keygen = os.environ.get('AGE_KEYGEN', 'age-keygen')
            identity = folder / 'test.agekey'
            subprocess.run([keygen, '-o', str(identity)], check=True, capture_output=True)
            public = subprocess.run([keygen, '-y', str(identity)], check=True, capture_output=True, text=True).stdout.strip()
            source = folder / 'source.sqlite'
            connection = sqlite3.connect(source)
            try:
                connection.execute('PRAGMA journal_mode=WAL')
                connection.execute('CREATE TABLE prueba(id INTEGER PRIMARY KEY, concepto TEXT NOT NULL)')
                connection.execute("INSERT INTO prueba VALUES(1, 'Escritura confirmada en WAL')")
                connection.commit()
                self.assertTrue(Path(str(source) + '-wal').exists())
                config = {'database': str(source), 'outbox': str(folder / 'outbox'), 'age_recipient': public, 'age_binary': age, 'keep_sent': 1}
                archive = create_archive(config)
                self.assertTrue(archive.read_bytes().startswith(b'age-encryption.org/v1'))
                destination = folder / 'restored.sqlite'
                restore(archive, identity, destination, age)
                with closing(sqlite3.connect(destination)) as restored:
                    self.assertEqual(restored.execute('SELECT concepto FROM prueba').fetchone()[0], 'Escritura confirmada en WAL')
                with self.assertRaises(FileExistsError):
                    restore(archive, identity, destination, age)
                def fail(*_):
                    raise ConnectionError('Fallo SMTP simulado')
                with self.assertRaises(ConnectionError):
                    deliver_pending(config, fail)
                self.assertTrue(archive.exists())
                self.assertTrue(archive.with_suffix(archive.suffix + '.pending').exists())
                received = []
                deliver_pending(config, lambda _, value: received.append(value))
                self.assertEqual(received, [archive])
                self.assertFalse(archive.with_suffix(archive.suffix + '.pending').exists())
                second = create_archive(config)
                deliver_pending(config, lambda _, value: received.append(value))
                self.assertEqual(received, [archive, second])
                self.assertTrue(second.exists())
                self.assertFalse(archive.exists())
            finally:
                connection.close()

    def test_missing_database_never_creates_an_empty_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            with self.assertRaises(FileNotFoundError):
                snapshot(folder / 'missing.sqlite', folder / 'copy.sqlite')
            self.assertFalse((folder / 'copy.sqlite').exists())


if __name__ == '__main__':
    unittest.main()
