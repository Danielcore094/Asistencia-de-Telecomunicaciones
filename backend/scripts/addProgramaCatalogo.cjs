const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:NuevaClaveFuerte123%21@127.0.0.1:5432/telecom_attendance',
});

async function run() {
    await client.connect();
    await client.query(
        "ALTER TABLE materias_catalogo ADD COLUMN IF NOT EXISTS programa VARCHAR(200) NOT NULL DEFAULT 'Ingenieria de Telecomunicaciones'"
    );
    await client.query(
        "UPDATE materias_catalogo SET programa = 'Ingenieria de Telecomunicaciones'"
    );
    const { rows } = await client.query(
        'SELECT programa, COUNT(*) AS total FROM materias_catalogo GROUP BY programa ORDER BY programa'
    );
    console.log('Programas en catálogo:');
    rows.forEach(r => console.log(' -', r.programa, ':', r.total, 'materias'));
    await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
