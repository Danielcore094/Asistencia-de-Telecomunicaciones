import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const ejecutarArchivo = promisify(execFile);
const urlBaseDatos = process.env.DATABASE_URL;
const directorioSalida = resolve(process.env.BACKUP_OUTPUT_DIR || 'backups');

if (!urlBaseDatos) {
    throw new Error('DATABASE_URL es requerida para crear el respaldo.');
}

const fecha = new Date().toISOString().replace(/[:.]/g, '-');
const archivoSalida = resolve(directorioSalida, `asistencia-${fecha}.dump`);

await mkdir(directorioSalida, { recursive: true });

await ejecutarArchivo('pg_dump', [
    `--dbname=${urlBaseDatos}`,
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    `--file=${archivoSalida}`,
], {
    windowsHide: true,
});

const respaldo = await stat(archivoSalida);
if (respaldo.size === 0) {
    throw new Error('El respaldo se creó vacío.');
}

console.log(`Respaldo creado: ${archivoSalida}`);