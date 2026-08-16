/**
 * probarReporteSemanal.js
 * Script de prueba independiente para ejecutar la notificación semanal.
 * Uso: node backend/probarReporteSemanal.js
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('──────────────────────────────────────────');
console.log('  PRUEBA: ejecutarNotificacionSemanalInasistencias()');
console.log('  Destinatario:', process.env.WEEKLY_REPORT_RECIPIENT_EMAIL);
console.log('  Hora:', new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
console.log('──────────────────────────────────────────\n');

const { ejecutarNotificacionSemanalInasistencias } = await import('./src/jobs/notificacionSemanalInasistencias.js');

try {
    const resultado = await ejecutarNotificacionSemanalInasistencias();
    console.log('\n✅ Ejecución completada:');
    console.log('  Enviados:', resultado.sent);
    console.log('  Omitidos:', resultado.skipped);
    console.log('  Errores: ', resultado.errors);
} catch (err) {
    console.error('\n❌ Error en ejecución:', err.message);
    console.error(err.stack);
} finally {
    process.exit(0);
}
