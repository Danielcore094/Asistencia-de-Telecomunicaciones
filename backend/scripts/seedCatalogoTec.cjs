const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL ||
    'postgresql://postgres:NuevaClaveFuerte123%21@127.0.0.1:5432/telecom_attendance';

const PROG_TEC = 'Tecnologia en Gestion de Sistemas de Telecomunicaciones';
const PROG_ING = 'Ingenieria de Telecomunicaciones';

// Tecnología — todos los semestres según PENSUM TTC2019-2
const MATERIAS_TEC = [
    // Período 1
    { id: 'tec001', codigo: 'DCB001', nombre: 'ALGEBRA SUPERIOR',                          semestre: 1 },
    { id: 'tec002', codigo: 'DCB002', nombre: 'CALCULO DIFERENCIAL',                       semestre: 1 },
    { id: 'tec003', codigo: 'FCN006', nombre: 'LOGICA Y ALGORITMOS',                       semestre: 1 },
    { id: 'tec004', codigo: 'TTC101', nombre: 'MEDIOS DE TRANSMISION',                     semestre: 1 },
    { id: 'tec005', codigo: 'DHI014', nombre: 'PROCESOS DE LECTURA Y ESCRITURA',           semestre: 1 },
    { id: 'tec006', codigo: 'DHI016', nombre: 'CULTURA FISICA',                            semestre: 1 },
    // Período 2
    { id: 'tec007', codigo: 'FCN001', nombre: 'ANALISIS DE CIRCUITOS ELECTRICOS I',        semestre: 2 },
    { id: 'tec008', codigo: 'FCN015', nombre: 'LABORATORIO MEDIDAS Y CIRCUITOS ELECTRICOS',semestre: 2 },
    { id: 'tec009', codigo: 'DCB009', nombre: 'MECANICA',                                  semestre: 2 },
    { id: 'tec010', codigo: 'DHO00A', nombre: 'OPTATIVA I',                                semestre: 2 },
    { id: 'tec011', codigo: 'FCN017', nombre: 'PROGRAMACION',                              semestre: 2 },
    { id: 'tec012', codigo: 'TTC400', nombre: 'TELEMATICA I',                              semestre: 2 },
    { id: 'tec013', codigo: 'DCB003', nombre: 'CALCULO INTEGRAL',                          semestre: 2 },
    // Período 3
    { id: 'tec014', codigo: 'FCN002', nombre: 'ANALISIS DE CIRCUITOS ELECTRICOS II',       semestre: 3 },
    { id: 'tec015', codigo: 'FCN003', nombre: 'ELECTRONICA I',                             semestre: 3 },
    { id: 'tec016', codigo: 'DCB010', nombre: 'ELECTROMAGNETISMO',                         semestre: 3 },
    { id: 'tec017', codigo: 'DHI029', nombre: 'EPISTEMOLOGIA',                             semestre: 3 },
    { id: 'tec018', codigo: 'DHO00B', nombre: 'OPTATIVA II',                               semestre: 3 },
    { id: 'tec019', codigo: 'TTC501', nombre: 'TELEMATICA II',                             semestre: 3 },
    // Período 4
    { id: 'tec020', codigo: 'FCN004', nombre: 'ELECTRONICA II',                            semestre: 4 },
    { id: 'tec021', codigo: 'DDI009', nombre: 'INGLES I',                                  semestre: 4 },
    { id: 'tec022', codigo: 'FCN007', nombre: 'COMUNICACIONES ANALOGAS',                   semestre: 4 },
    { id: 'tec023', codigo: 'FCN010', nombre: 'LABORATORIO COMUNICACIONES ANALOGAS',       semestre: 4 },
    { id: 'tec024', codigo: 'TTC402', nombre: 'LABORATORIO DE ELECTRONICA',                semestre: 4 },
    { id: 'tec025', codigo: 'DCB011', nombre: 'LABORATORIO DE FISICA',                     semestre: 4 },
    { id: 'tec026', codigo: 'TTC604', nombre: 'TELEMATICA III',                            semestre: 4 },
    // Período 5
    { id: 'tec027', codigo: 'FCN008', nombre: 'ELECTRONICA DIGITAL',                       semestre: 5 },
    { id: 'tec028', codigo: 'FCN009', nombre: 'LABORATORIO DE ELECTRONICA DIGITAL',        semestre: 5 },
    { id: 'tec029', codigo: 'TTC502', nombre: 'COMUNICACIONES DIGITALES I',                semestre: 5 },
    { id: 'tec030', codigo: 'TTC00J', nombre: 'ELECTIVA DE PROFUNDIZACION I',              semestre: 5 },
    { id: 'tec031', codigo: 'DDI010', nombre: 'INGLES II',                                 semestre: 5 },
    { id: 'tec032', codigo: 'DHI023', nombre: 'METODOLOGIA DE LA INVESTIGACION I',         semestre: 5 },
    { id: 'tec033', codigo: 'TTC503', nombre: 'PROGRAMACION WEB',                          semestre: 5 },
    // Período 6
    { id: 'tec034', codigo: 'FCN030', nombre: 'INTRODUCCION A LA INGENIERIA',              semestre: 6 },
    { id: 'tec035', codigo: 'TTC600', nombre: 'COMUNICACIONES DIGITALES II',               semestre: 6 },
    { id: 'tec036', codigo: 'TTC607', nombre: 'CONMUTACION DIGITAL',                       semestre: 6 },
    { id: 'tec037', codigo: 'TTC00K', nombre: 'ELECTIVA DE PROFUNDIZACION II',             semestre: 6 },
    { id: 'tec038', codigo: 'TTC606', nombre: 'LABORATORIO DE COMUNICACIONES DIGITALES',   semestre: 6 },
    { id: 'tec039', codigo: 'DCB008', nombre: 'CALCULO MULTIVARIABLE',                     semestre: 6 },
    { id: 'tec040', codigo: 'DHI003', nombre: 'ETICA',                                     semestre: 6 },
];

async function run() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    // 1. Agregar columna semestre (nullable para no romper los existentes)
    await client.query(
        'ALTER TABLE materias_catalogo ADD COLUMN IF NOT EXISTS semestre INTEGER'
    );

    // 2. Eliminar el índice único sobre solo codigo (reemplazado por codigo+programa)
    await client.query('DROP INDEX IF EXISTS materias_catalogo_codigo_key');

    // 3. Insertar materias de Tecnología
    for (const m of MATERIAS_TEC) {
        await client.query(
            `INSERT INTO materias_catalogo (id, codigo, nombre, programa, semestre)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (codigo, programa) DO UPDATE SET nombre = EXCLUDED.nombre, semestre = EXCLUDED.semestre`,
            [m.id, m.codigo, m.nombre, PROG_TEC, m.semestre]
        );
    }

    // 4. Resumen
    const { rows } = await client.query(
        'SELECT programa, COUNT(*) AS total FROM materias_catalogo GROUP BY programa ORDER BY programa'
    );
    console.log('Catálogo actualizado:');
    rows.forEach(r => console.log(' -', r.programa, ':', r.total, 'materias'));

    await client.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
