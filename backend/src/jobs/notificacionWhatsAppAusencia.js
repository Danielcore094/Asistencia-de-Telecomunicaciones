
import prisma from '../lib/prisma.js';
import { enviarMensajeWhatsApp } from '../lib/servicioWhatsapp.js';
import { obtenerIdentificadorHorario } from '../lib/horarioCurso.js';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function construirMensajeAusencia({ studentName, date, courseName }) {
    const [anio, mes, dia] = date.split('-');
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    return (
        `Estimado/a ${studentName}, le informamos que el día ${fechaFormateada} ` +
        `se registró una inasistencia en la asignatura ${courseName}. ` +
        `Si considera que existe un error, comuníquese con la coordinación académica.`
    );
}

export async function ejecutarNotificacionWhatsAppAusencia(registros, idCurso, fecha) {
    const delayConfigurado = Number(process.env.WHATSAPP_SEND_DELAY_MS ?? 10000);
    const delayEnvioMs = Number.isFinite(delayConfigurado)
        ? Math.max(delayConfigurado, 8000)
        : 10000;

    console.log('\n════════════════════════════════════════');
    console.log('[whatsapp-job] Iniciando notificaciones de ausencia por WhatsApp...');
    console.log(`[whatsapp-job] Curso: ${idCurso} | Fecha: ${fecha}`);
    console.log('════════════════════════════════════════\n');

    const estadisticas = { enviados: 0, omitidos: 0, errores: 0 };

    try {
        const idsAusentes = registros
            .filter(r => !r.present)
            .map(r => r.studentId);

        if (idsAusentes.length === 0) {
            console.log('[whatsapp-job] No hay estudiantes ausentes. Nada que enviar.');
            return;
        }

        const [estudiantes, curso] = await Promise.all([
            prisma.estudiante.findMany({
                where: { documento: { in: idsAusentes } },
                select: { documento: true, name: true, whatsapp: true },
            }),
            prisma.curso.findUnique({
                where: { id: idCurso },
                select: {
                    name: true,
                    dia: true,
                    horaInicio: true,
                    horaFin: true,
                    dia2: true,
                    horaInicio2: true,
                    horaFin2: true,
                },
            }),
        ]);

        if (!curso) {
            console.error(`[whatsapp-job] Curso ${idCurso} no encontrado.`);
            return;
        }

        for (const estudiante of estudiantes) {
            const claveLog = {
                studentId: estudiante.documento,
                courseId: idCurso,
                date: fecha,
                schedule: obtenerIdentificadorHorario(curso),
            };

            if (!estudiante.whatsapp) {
                console.warn(`[whatsapp-job] Sin WhatsApp: ${estudiante.name} (${estudiante.documento})`);
                await prisma.registroNotificacionWhatsapp.upsert({
                    where: { studentId_courseId_date_schedule: claveLog },
                    update: { status: 'ERROR', error: 'Sin número de WhatsApp', sentAt: new Date() },
                    create: { ...claveLog, status: 'ERROR', error: 'Sin número de WhatsApp' },
                });
                estadisticas.errores++;
                continue;
            }

            const existente = await prisma.registroNotificacionWhatsapp.findUnique({
                where: { studentId_courseId_date_schedule: claveLog },
            });

            if (existente?.status === 'SUCCESS') {
                console.log(`[whatsapp-job] Ya notificado exitosamente: ${estudiante.name} (${fecha}). Omitiendo.`);
                estadisticas.omitidos++;
                continue;
            }

            const mensaje = construirMensajeAusencia({
                studentName: estudiante.name,
                date: fecha,
                courseName: curso.name,
            });

            const resultado = await enviarMensajeWhatsApp({
                phone: estudiante.whatsapp,
                message: mensaje,
            });

            await prisma.registroNotificacionWhatsapp.upsert({
                where: { studentId_courseId_date_schedule: claveLog },
                update: {
                    status: resultado.success ? 'SUCCESS' : 'ERROR',
                    error: resultado.success ? null : resultado.error,
                    sentAt: new Date(),
                },
                create: {
                    ...claveLog,
                    status: resultado.success ? 'SUCCESS' : 'ERROR',
                    error: resultado.success ? null : resultado.error,
                },
            });

            if (resultado.success) {
                console.log(`[whatsapp-job] ✅ Enviado a ${estudiante.name} (${estudiante.whatsapp})`);
                estadisticas.enviados++;
            } else {
                console.error(`[whatsapp-job] ❌ Error enviando a ${estudiante.name} — ${resultado.error}`);
                estadisticas.errores++;
            }

            if (estudiantes.indexOf(estudiante) < estudiantes.length - 1) {
                console.log(`[whatsapp-job] 🕐 Esperando ${delayEnvioMs / 1000}s antes del próximo envío...`);
                await esperar(delayEnvioMs);
            }
        }
    } catch (err) {
        console.error('[whatsapp-job] Error crítico:', err.message);
        estadisticas.errores++;
    }

    console.log('\n════════════════════════════════════════');
    console.log('[whatsapp-job] Resumen final:');
    console.log(`  ✅ Enviados:  ${estadisticas.enviados}`);
    console.log(`  ⏭️  Omitidos:  ${estadisticas.omitidos}`);
    console.log(`  ❌ Errores:   ${estadisticas.errores}`);
    console.log('════════════════════════════════════════\n');
}
