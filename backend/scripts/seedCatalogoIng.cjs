const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:NuevaClaveFuerte123%21@127.0.0.1:5432/telecom_attendance';
const PROG_ING = 'Ingenieria de Telecomunicaciones';

// Pensum PTC2019-2 — Ingeniería de Telecomunicaciones (4 períodos)
const PENSUM_ING = [
    // Período 1
    { codigo: 'DDI012', nombre: 'INGLES III',                          semestre: 1 },
    { codigo: 'PTC102', nombre: 'LINUX',                               semestre: 1 },
    { codigo: 'DCB020', nombre: 'ALGEBRA LINEAL',                      semestre: 1 },
    { codigo: 'DCB007', nombre: 'ECUACIONES DIFERENCIALES',            semestre: 1 },
    { codigo: 'DCB030', nombre: 'ESTADISTICA PARA INGENIEROS',         semestre: 1 },
    { codigo: 'DCB023', nombre: 'ONDAS Y PARTICULAS',                  semestre: 1 },
    // Período 2
    { codigo: 'PTC101', nombre: 'BASES DE DATOS',                      semestre: 2 },
    { codigo: 'PTC402', nombre: 'ADMINISTRACION DE REDES',             semestre: 2 },
    { codigo: 'DDI013', nombre: 'INGLES IV',                           semestre: 2 },
    { codigo: 'PTC205', nombre: 'SENALES Y SISTEMAS',                  semestre: 2 },
    { codigo: 'PTC204', nombre: 'SERVICIOS BAJO LINUX',                semestre: 2 },
    { codigo: 'DCB032', nombre: 'ANALISIS NUMERICO',                   semestre: 2 },
    // Período 3
    { codigo: 'PTC301', nombre: 'COMUNICACIONES INALAMBRICAS',         semestre: 3 },
    { codigo: 'PTC00E', nombre: 'ELECTIVA DE PROFUNDIZACION III',      semestre: 3 },
    { codigo: 'DHI030', nombre: 'EMPRENDIMIENTO',                      semestre: 3 },
    { codigo: 'DHI024', nombre: 'METODOLOGIA DE LA INVESTIGACION II',  semestre: 3 },
    { codigo: 'DHO00C', nombre: 'OPTATIVA III',                        semestre: 3 },
    { codigo: 'PTC306', nombre: 'PROGRAMACION EN JAVA',                semestre: 3 },
    { codigo: 'PTC307', nombre: 'TELEFONIA IP',                        semestre: 3 },
    // Período 4
    { codigo: 'PTC302', nombre: 'LABORATORIO DE COMUNICACIONES INALAMBRICAS', semestre: 4 },
    { codigo: 'PTC303', nombre: 'REDES DE BANDA ANCHA',                semestre: 4 },
    { codigo: 'PTC406', nombre: 'COMUNICACIONES AVANZADAS',            semestre: 4 },
    { codigo: 'PTC00F', nombre: 'ELECTIVA DE PROFUNDIZACION IV',       semestre: 4 },
    { codigo: 'DHO00D', nombre: 'OPTATIVA IV',                         semestre: 4 },
    { codigo: 'PTC405', nombre: 'PROGRAMACION DE DISPOSITIVOS MOVILES',semestre: 4 },
    { codigo: 'PTC404', nombre: 'SEGURIDAD EN REDES',                  semestre: 4 },
];

async function run() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    // Obtener catálogo actual de Ingeniería
    const { rows: existentes } = await client.query(
        'SELECT codigo FROM materias_catalogo WHERE programa = $1',
        [PROG_ING]
    );
    const codigosExistentes = new Set(existentes.map(r => r.codigo));

    let insertados = 0, actualizados = 0;

    for (const m of PENSUM_ING) {
        if (codigosExistentes.has(m.codigo)) {
            // Actualizar semestre y nombre en los existentes
            await client.query(
                'UPDATE materias_catalogo SET semestre = $1, nombre = $2 WHERE codigo = $3 AND programa = $4',
                [m.semestre, m.nombre, m.codigo, PROG_ING]
            );
            actualizados++;
        } else {
            // Insertar nueva materia de Ingeniería
            const newId = 'ing' + m.codigo.toLowerCase().replace(/[^a-z0-9]/g, '');
            await client.query(
                `INSERT INTO materias_catalogo (id, codigo, nombre, programa, semestre)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (codigo, programa) DO UPDATE SET nombre = EXCLUDED.nombre, semestre = EXCLUDED.semestre`,
                [newId, m.codigo, m.nombre, PROG_ING, m.semestre]
            );
            insertados++;
            console.log('  + NUEVA:', m.codigo, '-', m.nombre);
        }
    }

    const { rows: totales } = await client.query(
        'SELECT programa, COUNT(*) AS total FROM materias_catalogo GROUP BY programa ORDER BY programa'
    );

    console.log(`\nInsertadas: ${insertados} | Actualizadas (semestre): ${actualizados}`);
    console.log('Catálogo final:');
    totales.forEach(r => console.log(' -', r.programa, ':', r.total, 'materias'));

    await client.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
