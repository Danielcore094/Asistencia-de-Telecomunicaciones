/**
 * notificacionSemanalInasistencias.js
 * Coordina el envío del reporte semanal de asistencia.
 *
 * Lógica:
 *   1. Genera un Excel POR DOCENTE con solo sus materias (semana anterior).
 *   2. Envía un email por docente al destinatario configurado (WEEKLY_REPORT_RECIPIENT_EMAIL).
 *   3. También envía notificaciones individuales a estudiantes con inasistencias.
 */

import prisma from '../lib/prisma.js';
import {
    enviarCorreo,
    construirCorreoInasistenciasHTML,
    construirCorreoReporteSemanalHTML,
} from '../lib/servicioCorreo.js';
import {
    obtenerInasistenciasSemanales,
    crearReportesSemanalesPorDocente,
} from '../lib/servicioAsistencia.js';

export async function ejecutarNotificacionSemanalInasistencias() {
    console.log('\n========================================');
    console.log('[notification-job] Iniciando envío de notificaciones semanales...');
    console.log(`[notification-job] Hora: ${new Date().toISOString()}`);
    console.log('========================================\n');

    const resultados = { sent: 0, skipped: 0, errors: 0, details: [] };
    const destinatario = process.env.WEEKLY_REPORT_RECIPIENT_EMAIL;

    // ── 1. Generar y enviar un Excel por docente ──────────────────────────
    if (destinatario) {
        try {
            const reportesPorDocente = await crearReportesSemanalesPorDocente();

            if (reportesPorDocente.length === 0) {
                console.log('[notification-job] Sin reportes por docente para enviar.');
            }

            for (const reporte of reportesPorDocente) {
                try {
                    const { teacherName, buffer, weekStart, weekEnd, courseCount } = reporte;
                    const nombreArchivo = `reporte-${teacherName.replace(/\s+/g, '-').toLowerCase()}-${weekStart}.xlsx`;

                    const htmlContent = construirCorreoReporteSemanalHTML({
                        weekStart,
                        weekEnd,
                        courseCount,
                        totalRecords: 0,
                        teacherName,
                    });

                    const resultado = await enviarCorreo({
                        to:          destinatario,
                        toName:      process.env.WEEKLY_REPORT_RECIPIENT_NAME || 'Administrador',
                        subject:     `Reporte semanal — ${teacherName} (${weekStart} al ${weekEnd})`,
                        htmlContent,
                        attachments: [{
                            name:    nombreArchivo,
                            content: buffer.toString('base64'),
                        }],
                    });

                    if (resultado.success) {
                        console.log(`[notification-job] ✅ Reporte enviado — Docente: ${teacherName}`);
                        resultados.sent++;
                    } else {
                        console.error(`[notification-job] ❌ Error enviando reporte de ${teacherName}: ${resultado.error}`);
                        resultados.errors++;
                    }
                } catch (errDocente) {
                    console.error(`[notification-job] Error procesando docente ${reporte.teacherName}:`, errDocente.message);
                    resultados.errors++;
                }
            }
        } catch (err) {
            console.error('[notification-job] Error generando reportes por docente:', err.message);
            resultados.errors++;
        }
    } else {
        console.log('[notification-job] Sin WEEKLY_REPORT_RECIPIENT_EMAIL configurado. Se omiten reportes Excel.');
    }

    // ── 2. Notificaciones individuales a estudiantes con inasistencias ────
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

            if (!estudiante.email) {
                console.warn(`[notification-job] Sin email: ${estudiante.studentName} (${estudiante.studentId})`);
                entradaLog.status = 'SKIPPED';
                entradaLog.reason = 'Sin email registrado';
                resultados.skipped++;
                resultados.details.push(entradaLog);
                continue;
            }

            // Evitar duplicados
            const existente = await prisma.registroNotificacion.findUnique({
                where: {
                    studentId_weekStart: {
                        studentId: estudiante.studentId,
                        weekStart: estudiante.weekStart,
                    },
                },
            });

            if (existente) {
                console.log(`[notification-job] Duplicado omitido: ${estudiante.studentName}`);
                entradaLog.status = 'SKIPPED';
                entradaLog.reason = 'Ya se envió correo esta semana';
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
                await prisma.registroNotificacion.create({
                    data: {
                        studentId: estudiante.studentId,
                        weekStart: estudiante.weekStart,
                        status:    'SUCCESS',
                    },
                });
                console.log(`[notification-job] ✅ Enviado a: ${estudiante.email} (${estudiante.studentName})`);
                entradaLog.status = 'SUCCESS';
                resultados.sent++;
            } else {
                await prisma.registroNotificacion.create({
                    data: {
                        studentId: estudiante.studentId,
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

    console.log('\n========================================');
    console.log('[notification-job] Resumen final:');
    console.log(`  ✅ Enviados:  ${resultados.sent}`);
    console.log(`  ⏭️  Omitidos:  ${resultados.skipped}`);
    console.log(`  ❌ Errores:   ${resultados.errors}`);
    console.log('========================================\n');

    return resultados;
}
