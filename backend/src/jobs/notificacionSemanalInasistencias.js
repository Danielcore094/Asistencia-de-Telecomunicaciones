
import prisma from '../lib/prisma.js';
import {
    enviarCorreo,
    construirCorreoInasistenciasHTML,
} from '../lib/servicioCorreo.js';
import {
    obtenerInasistenciasSemanales,
} from '../lib/servicioAsistencia.js';
import { registrarAccion } from '../lib/servicioAuditoria.js';

export async function ejecutarNotificacionSemanalInasistencias({ usuario = null, origen = 'AUTOMATICO' } = {}) {
    console.log('\n========================================');
    console.log('[notification-job] Iniciando envío de notificaciones semanales...');
    console.log(`[notification-job] Hora: ${new Date().toISOString()}`);
    console.log('========================================\n');

    const resultados = { sent: 0, skipped: 0, errors: 0, details: [] };
    const usuarioAuditoria = usuario || { id: 'SISTEMA_AUTOMATICO', name: 'Sistema automático', role: 'SYSTEM' };

    try {
        const listaInasistencias = await obtenerInasistenciasSemanales();

        if (listaInasistencias.length === 0) {
            console.log('[notification-job] Sin inasistencias en la semana. No se envían correos a estudiantes.');
        }

        for (const estudiante of listaInasistencias) {
            const entradaLog = {
                studentId:   estudiante.studentId,
                studentName: estudiante.studentName,
                email:       estudiante.email,
                weekStart:   estudiante.weekStart,
                status:      null,
                reason:      null,
            };

            const existente = await prisma.registroNotificacion.findUnique({
                where: {
                    studentId_weekStart: {
                        studentId: estudiante.studentId,
                        weekStart: estudiante.weekStart,
                    },
                },
            });

            if (existente?.status === 'SUCCESS') {
                console.log(`[notification-job] Duplicado omitido: ${estudiante.studentName}`);
                entradaLog.status = 'SKIPPED';
                entradaLog.reason = 'Ya se envió correo esta semana';
                resultados.skipped++;
                resultados.details.push(entradaLog);
                continue;
            }

            if (!estudiante.email) {
                console.warn(`[notification-job] Sin email: ${estudiante.studentName} (${estudiante.studentId})`);
                entradaLog.status = 'SKIPPED';
                entradaLog.reason = 'Sin email registrado';
                await prisma.registroNotificacion.upsert({
                    where: {
                        studentId_weekStart: {
                            studentId: estudiante.studentId,
                            weekStart: estudiante.weekStart,
                        },
                    },
                    update: { email: null, status: 'SKIPPED', error: entradaLog.reason },
                    create: {
                        studentId: estudiante.studentId,
                        email: null,
                        weekStart: estudiante.weekStart,
                        status: 'SKIPPED',
                        error: entradaLog.reason,
                    },
                });
                resultados.skipped++;
                resultados.details.push(entradaLog);
                continue;
            }

            const contenidoHtml = construirCorreoInasistenciasHTML({
                studentName:   estudiante.studentName,
                totalAbsences: estudiante.totalAbsences,
                courses:       estudiante.courses,
                weekStart:     estudiante.weekStart,
                weekEnd:       estudiante.weekEnd,
            });

            const resultadoCorreo = await enviarCorreo({
                to:          estudiante.email,
                toName:      estudiante.studentName,
                subject:     'Reporte semanal de inasistencias',
                htmlContent: contenidoHtml,
            });

            if (resultadoCorreo.success) {
                await prisma.registroNotificacion.upsert({
                    where: { studentId_weekStart: { studentId: estudiante.studentId, weekStart: estudiante.weekStart } },
                    update: {
                        email: estudiante.email,
                        status: 'SUCCESS',
                        error: null,
                    },
                    create: {
                        studentId: estudiante.studentId,
                        email: estudiante.email,
                        weekStart: estudiante.weekStart,
                        status:    'SUCCESS',
                    },
                });
                console.log(`[notification-job] ✅ Enviado a: ${estudiante.email} (${estudiante.studentName})`);
                entradaLog.status = 'SUCCESS';
                resultados.sent++;
            } else {
                await prisma.registroNotificacion.upsert({
                    where: { studentId_weekStart: { studentId: estudiante.studentId, weekStart: estudiante.weekStart } },
                    update: {
                        email: estudiante.email,
                        status: 'ERROR',
                        error: resultadoCorreo.error,
                    },
                    create: {
                        studentId: estudiante.studentId,
                        email: estudiante.email,
                        weekStart: estudiante.weekStart,
                        status:    'ERROR',
                        error:     resultadoCorreo.error,
                    },
                });
                console.error(`[notification-job] ❌ Error enviando a: ${estudiante.email} — ${resultadoCorreo.error}`);
                entradaLog.status = 'ERROR';
                entradaLog.reason = resultadoCorreo.error;
                resultados.errors++;
            }

            resultados.details.push(entradaLog);
        }
    } catch (err) {
        console.error('[notification-job] Error en notificaciones de estudiantes:', err.message);
        resultados.errors++;
    }

    await registrarAccion({
        usuario: usuarioAuditoria,
        accion: 'ENVIAR_NOTIFICACIONES_INASISTENCIA',
        target: 'NOTIFICATION',
        detalles: {
            origen,
            sent: resultados.sent,
            skipped: resultados.skipped,
            errors: resultados.errors,
            destinatarios: resultados.details,
        },
    });

    console.log('\n========================================');
    console.log('[notification-job] Resumen final:');
    console.log(`  ✅ Enviados:  ${resultados.sent}`);
    console.log(`  ⏭️  Omitidos:  ${resultados.skipped}`);
    console.log(`  ❌ Errores:   ${resultados.errors}`);
    console.log('========================================\n');

    return resultados;
}
