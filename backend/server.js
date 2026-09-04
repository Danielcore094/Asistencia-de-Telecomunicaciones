
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import cron from 'node-cron';

let ejecutarNotificacionSemanalInasistencias;

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '4000', 10);
const ejecutarCron = process.env.EJECUTAR_CRON === 'true';

const usaLimitadorLocal = process.env.USAR_LIMITADOR_LOCAL === 'true';

if (!dev && (!process.env.JWT_SECRET || !process.env.CORS_ALLOWED_ORIGINS || (!usaLimitadorLocal && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)))) {
    console.error('[server] JWT_SECRET, CORS_ALLOWED_ORIGINS y las credenciales Redis son obligatorios en producción');
    process.exit(1);
}

const app = next({ dev, dir: '.' });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    const moduloNotificacion = await import('./src/jobs/notificacionSemanalInasistencias.js');
    ejecutarNotificacionSemanalInasistencias = moduloNotificacion.ejecutarNotificacionSemanalInasistencias;

    if (ejecutarCron) {
        cron.schedule('0 9 * * 0', async () => {
            console.log('\n[cron] Notificaciones a estudiantes - Domingo 09:00');
            try {
                await ejecutarNotificacionSemanalInasistencias({ origen: 'AUTOMATICO', tipo: 'ESTUDIANTES' });
            } catch (err) {
                console.error('[cron] Error en tarea programada:', err.message);
            }
        }, {
            scheduled: true,
            timezone: 'America/Bogota',
        });

        cron.schedule('0 6 * * 1', async () => {
            console.log('\n[cron] Reportes a docentes y administrador - Lunes 06:00');
            try {
                await ejecutarNotificacionSemanalInasistencias({ origen: 'AUTOMATICO', tipo: 'REPORTES' });
            } catch (err) {
                console.error('[cron] Error en tarea programada:', err.message);
            }
        }, {
            scheduled: true,
            timezone: 'America/Bogota',
        });

        console.log('[server] Cron configurado: estudiantes domingos 09:00 y reportes lunes 06:00 (America/Bogota)');
    } else {
        console.log('[server] Cron deshabilitado en esta instancia');
    }

    createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(PORT, (err) => {
        if (err) {
            console.error('[server] Error al iniciar:', err);
            process.exit(1);
        }
        console.log(`[server] Servidor corriendo en http://localhost:${PORT}`);
        console.log(`[server] Modo: ${dev ? 'desarrollo' : 'producción'}`);
    });
});
