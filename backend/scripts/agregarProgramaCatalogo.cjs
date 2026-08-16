const { Client } = require('pg');

const cliente = new Client({
    connectionString: 'postgresql://postgres:NuevaClaveFuerte123%21@127.0.0.1:5432/telecom_attendance',
});

async function run() {
    await cliente.connect();
    await cliente.query(
        "ALTER TABLE materias_catalogo ADD COLUMN IF NOT EXISTS programa VARCHAR(200) NOT NULL DEFAULT 'Ingenieria de Telecomunicaciones'"
    );
    await cliente.query(
        "UPDATE materias_catalogo SET programa = 'Ingenieria de Telecomunicaciones'"
    );
    const { rows } = await cliente.query(
        'SELECT programa, COUNT(*) AS total FROM materias_catalogo GROUP BY programa ORDER BY programa'
    );
    console.log('Programas en catálogo:');
    rows.forEach(r => console.log(' -', r.programa, ':', r.total, 'materias'));
    await cliente.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
