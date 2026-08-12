const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL ||
    'postgresql://postgres:NuevaClaveFuerte123%21@127.0.0.1:5432/telecom_attendance';

const MATERIAS = [
    { id: 'cat001', codigo: 'DHI023', nombre: 'METODOLOGIA DE LA INVESTIGACION I', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat002', codigo: 'FCN001', nombre: 'ANALISIS DE CIRCUITOS ELECTRICOS I', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat003', codigo: 'FCN002', nombre: 'ANALISIS DE CIRCUITOS ELECTRICOS II', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat004', codigo: 'FCN003', nombre: 'ELECTRONICA I', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat005', codigo: 'FCN004', nombre: 'ELECTRONICA II', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat006', codigo: 'FCN006', nombre: 'LOGICA Y ALGORITMOS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat007', codigo: 'FCN007', nombre: 'COMUNICACIONES ANALOGAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat008', codigo: 'FCN008', nombre: 'ELECTRONICA DIGITAL', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat009', codigo: 'FCN009', nombre: 'LABORATORIO DE ELECTRONICA DIGITAL', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat010', codigo: 'FCN010', nombre: 'LABORATORIO COMUNICACIONES ANALOGAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat011', codigo: 'FCN015', nombre: 'LABORATORIO MEDIDAS Y CIRCUITOS ELECTRICOS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat012', codigo: 'FCN017', nombre: 'PROGRAMACION', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat013', codigo: 'FCN030', nombre: 'INTRODUCCION A LA INGENIERIA', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat014', codigo: 'PTC009', nombre: 'DOMOTICA', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat015', codigo: 'PTC010', nombre: 'GERENCIA TIC', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat016', codigo: 'PTC101', nombre: 'BASES DE DATOS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat017', codigo: 'PTC102', nombre: 'LINUX', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat018', codigo: 'PTC204', nombre: 'SERVICIOS BAJO LINUX', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat019', codigo: 'PTC205', nombre: 'SENALES Y SISTEMAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat020', codigo: 'PTC301', nombre: 'COMUNICACIONES INALAMBRICAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat021', codigo: 'PTC302', nombre: 'LABORATORIO DE COMUNICACIONES INALAMBRICAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat022', codigo: 'PTC303', nombre: 'REDES DE BANDA ANCHA', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat023', codigo: 'PTC306', nombre: 'PROGRAMACION EN JAVA', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat024', codigo: 'PTC307', nombre: 'TELEFONIA IP', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat025', codigo: 'PTC402', nombre: 'ADMINISTRACION DE REDES', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat026', codigo: 'PTC404', nombre: 'SEGURIDAD EN REDES', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat027', codigo: 'PTC405', nombre: 'PROGRAMACION DE DISPOSITIVOS MOVILES', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat028', codigo: 'PTC406', nombre: 'COMUNICACIONES AVANZADAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat029', codigo: 'TTC001', nombre: 'ANTENAS', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat030', codigo: 'TTC101', nombre: 'MEDIOS DE TRANSMISION', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat031', codigo: 'TTC400', nombre: 'TELEMATICA I', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat032', codigo: 'TTC402', nombre: 'LABORATORIO DE ELECTRONICA', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat033', codigo: 'TTC501', nombre: 'TELEMATICA II', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat034', codigo: 'TTC502', nombre: 'COMUNICACIONES DIGITALES I', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat035', codigo: 'TTC503', nombre: 'PROGRAMACION WEB', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat036', codigo: 'TTC600', nombre: 'COMUNICACIONES DIGITALES II', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat037', codigo: 'TTC604', nombre: 'TELEMATICA III', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat038', codigo: 'TTC605', nombre: 'DISPOSITIVOS PROGRAMABLES', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat039', codigo: 'TTC606', nombre: 'LABORATORIO DE COMUNICACIONES DIGITALES', programa: 'Ingenieria de Telecomunicaciones' },
    { id: 'cat040', codigo: 'TTC607', nombre: 'CONMUTACION DIGITAL', programa: 'Ingenieria de Telecomunicaciones' },
];

async function run() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    for (const m of MATERIAS) {
        await client.query(
            'INSERT INTO materias_catalogo (id, codigo, nombre, programa) VALUES ($1, $2, $3, $4) ON CONFLICT (codigo) DO UPDATE SET programa = EXCLUDED.programa',
            [m.id, m.codigo, m.nombre, m.programa]
        );
    }

    const { rows } = await client.query('SELECT COUNT(*) AS total FROM materias_catalogo');
    console.log('Catalogo poblado. Total registros:', rows[0].total);
    await client.end();
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
