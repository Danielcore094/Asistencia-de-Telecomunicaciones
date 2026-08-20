const { Client } = require('pg');

async function verificar() {
    const cliente = new Client({
        connectionString: "postgresql://postgres:postgres@localhost:5432/telecom_attendance"
    });

    try {
        await cliente.connect();
        console.log("Conexión correcta con la base de datos predeterminada 'postgres'.");

        const resultado = await cliente.query("SELECT datname, pg_get_userbyid(datdba) as owner FROM pg_database WHERE datname='telecom_attendance';");
        if (resultado.rows.length > 0) {
            console.log("La base de datos 'telecom_attendance' existe. Propietario:", resultado.rows[0].owner);
        } else {
            console.log("La base de datos 'telecom_attendance' no existe. Se procederá a crearla.");
            await cliente.query("CREATE DATABASE telecom_attendance;");
            console.log("Base de datos 'telecom_attendance' creada.");
        }

        const resultadoRol = await cliente.query("SELECT rolname, rolsuper FROM pg_roles WHERE rolname='postgres';");
        console.log("Estado de superusuario de 'postgres':", resultadoRol.rows[0].rolsuper);

    } catch (error) {
        console.error("Error de conexión:", error.message);
    } finally {
        await cliente.end();
    }
}

verificar();
