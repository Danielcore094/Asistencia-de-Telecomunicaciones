
import prisma from '../lib/prisma.js';
import {
    enviarCorreo,
    construirCorreoReporteSemanalHTML,
    construirCorreoInasistenciasHTML,
} from '../lib/servicioCorreo.js';
import {
    crearReportesSemanalesPorDocente,
    crearReporteExcelSemanalGeneral,
    obtenerInasistenciasSemanales,
} from '../lib/servicioAsistencia.js';
import { registrarAccion } from '../lib/servicioAuditoria.js';

async function enviarReportesDocentes(resultados) {
    let reportes;
    try {
        reportes = await crearReportesSemanalesPorDocente({ semanaActual: true });
    } catch (error) {
        resultados.errors++;
        resultados.details.push({
            tipo: 'REPORTE_DOCENTE',
            status: 'ERROR',
            reason: error.message,
        });
        console.error('[notification-job] Error generando reportes docentes:', error.message);
        return;
    }

    for (const reporte of reportes) {
        if (!reporte.teacherEmail) {
            resultados.skipped++;
            resultados.details.push({
                tipo: 'REPORTE_DOCENTE',
                destinatario: reporte.teacherName,
                status: 'SKIPPED',
                reason: 'Docente sin email registrado',
            });
            continue;
        }

        let resultadoCorreo;
        try {
            resultadoCorreo = await enviarCorreo({
                to: reporte.teacherEmail,
                toName: reporte.teacherName,
                subject: `Reporte semanal de asistencia - ${reporte.weekStart}`,
                htmlContent: construirCorreoReporteSemanalHTML({
                    teacherName: reporte.teacherName,
                    weekStart: reporte.weekStart,
                    weekEnd: reporte.weekEnd,
                    courseCount: reporte.courseCount,
                    totalRecords: reporte.totalRecords,
                    absentRecords: reporte.absentRecords,
                    absentStudents: reporte.absentStudents,
                    absencePercentage: reporte.absencePercentage,
                    absentStudentNames: reporte.absentStudentNames,
                }),
                attachments: [{
                    name: `Reporte_Semanal_${reporte.weekStart}_${reporte.weekEnd}.xlsx`,
                    content: reporte.buffer.toString('base64'),
                }],
            });
        } catch (error) {
            resultadoCorreo = { success: false, error: error.message };
        }

        resultados.details.push({
            tipo: 'REPORTE_DOCENTE',
            destinatario: reporte.teacherEmail,
            status: resultadoCorreo.success ? 'SUCCESS' : 'ERROR',
            reason: resultadoCorreo.error || null,
        });
        if (resultadoCorreo.success) resultados.sent++;
        else resultados.errors++;
    }
}

async function enviarReporteGeneralSemanal(resultados) {
    const destinatario = process.env.WEEKLY_REPORT_RECIPIENT_EMAIL;
    if (!destinatario) {
        resultados.skipped++;
        resultados.details.push({
            tipo: 'REPORTE_GENERAL_SEMANAL',
            status: 'SKIPPED',
            reason: 'WEEKLY_REPORT_RECIPIENT_EMAIL no está configurado',
        });
        return;
    }

    let reporte;
    try {
        reporte = await crearReporteExcelSemanalGeneral({ semanaActual: true });
    } catch (error) {
        resultados.errors++;
        resultados.details.push({ tipo: 'REPORTE_GENERAL_SEMANAL', destinatario, status: 'ERROR', reason: error.message });
        console.error('[notification-job] Error generando reporte general semanal:', error.message);
        return;
    }
    if (!reporte) {
        resultados.skipped++;
        resultados.details.push({
            tipo: 'REPORTE_GENERAL_SEMANAL',
            destinatario,
            status: 'SKIPPED',
            reason: 'No hay cursos con estudiantes para la semana',
        });
        return;
    }

    let resultadoCorreo;
    try {
        resultadoCorreo = await enviarCorreo({
            to: destinatario,
            toName: process.env.WEEKLY_REPORT_RECIPIENT_NAME || 'Administrador de Asistencia',
            subject: `Reporte semanal general de asistencia - ${reporte.weekStart}`,
            htmlContent: construirCorreoReporteSemanalHTML({
                teacherName: process.env.WEEKLY_REPORT_RECIPIENT_NAME || 'Administrador de Asistencia',
                weekStart: reporte.weekStart,
                weekEnd: reporte.weekEnd,
                courseCount: reporte.courseCount,
                totalRecords: reporte.totalRecords,
                absentRecords: reporte.absentRecords,
                absentStudents: reporte.absentStudents,
                absencePercentage: reporte.absencePercentage,
                absentStudentNames: reporte.absentStudentNames,
                includeAbsentNames: false,
            }),
            attachments: [{
                name: `Reporte_Semanal_General_${reporte.weekStart}_${reporte.weekEnd}.xlsx`,
                content: reporte.buffer.toString('base64'),
            }],
        });
    } catch (error) {
        resultadoCorreo = { success: false, error: error.message };
    }

    resultados.details.push({
        tipo: 'REPORTE_GENERAL_SEMANAL',
        destinatario,
        status: resultadoCorreo.success ? 'SUCCESS' : 'ERROR',
        reason: resultadoCorreo.error || null,
    });
    if (resultadoCorreo.success) resultados.sent++;
    else resultados.errors++;
}

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

        await enviarReportesDocentes(resultados);
        await enviarReporteGeneralSemanal(resultados);
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
