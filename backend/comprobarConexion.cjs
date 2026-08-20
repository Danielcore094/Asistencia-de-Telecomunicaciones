const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
    console.log('--- Iniciando prueba de conexión (CommonJS) ---');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Cargada correctamente' : 'No encontrada');

    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL no definida en .env');
        process.exit(1);
    }

    const cliente = new Client({
        connectionString: process.env.DATABASE_URL.replace(':5433', ':5432').replace(':Sopor1141@', ':Teleco2026@')
    });

    try {
        await cliente.connect();
        console.log('✅ Conexión exitosa a PostgreSQL.');

        const tablesRes = await cliente.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('Tablas encontradas:', tablesRes.rows.map(r => r.table_name).join(', '));

        if (tablesRes.rows.some(r => r.table_name === 'Student')) {
            const countRes = await cliente.query('SELECT COUNT(*) FROM "Student"');
            console.log(`Número de registros en 'Student': ${countRes.rows[0].count}`);
        }

    } catch (err) {
        console.error('❌ Error durante la prueba:', err);
        if (err.message) console.error('Mensaje de error:', err.message);
        if (err.stack) console.error('Stack trace:', err.stack);
    } finally {
        await cliente.end();
        console.log('--- Prueba finalizada ---');
    }
}

testConnection();
