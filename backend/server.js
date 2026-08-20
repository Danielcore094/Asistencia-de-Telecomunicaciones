
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import cron from 'node-cron';

let ejecutarNotificacionSemanalInasistencias;

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '4000', 10);
const ejecutarCron = process.env.EJECUTAR_CRON === 'true';

if (!dev && (!process.env.JWT_SECRET || !process.env.CORS_ALLOWED_ORIGINS || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) {
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
            console.log('\n[cron] Tarea semanal ejecutada - Domingo 09:00');
            try {
                await ejecutarNotificacionSemanalInasistencias();
            } catch (err) {
                console.error('[cron] Error en tarea programada:', err.message);
            }
        }, {
            scheduled: true,
            timezone: 'America/Bogota',
        });

        console.log('[server] Cron configurado: Domingos a las 09:00 AM (America/Bogota)');
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
