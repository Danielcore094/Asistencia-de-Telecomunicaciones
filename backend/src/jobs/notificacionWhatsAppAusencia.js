/**
 * notificacionWhatsAppAusencia.js
 * Envía notificaciones de WhatsApp a estudiantes ausentes
 * cuando el profesor guarda la asistencia de una clase.
 *
 * Se ejecuta en segundo plano para no bloquear la respuesta HTTP.
 * Espera el tiempo definido en WHATSAPP_SEND_DELAY_MS entre mensajes
 * para evitar bloqueos de WhatsApp/Evolution API.
 */

import prisma from '../lib/prisma.js';
import { enviarMensajeWhatsApp } from '../lib/servicioWhatsapp.js';

/** Espera N milisegundos */
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Construye el mensaje de texto para el estudiante ausente.
 *
 * @param {Object} params
 * @param {string} params.studentName
 * @param {string} params.date        - Formato YYYY-MM-DD
 * @param {string} params.courseName
 * @returns {string}
 */
function construirMensajeAusencia({ studentName, date, courseName }) {
    // Convertir YYYY-MM-DD a DD/MM/YYYY para el mensaje
    const [anio, mes, dia] = date.split('-');
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    return (
        `Estimado/a ${studentName}, le informamos que el día ${fechaFormateada} ` +
        `se registró una inasistencia en la asignatura ${courseName}. ` +
        `Si considera que existe un error, comuníquese con la coordinación académica.`
    );
}

/**
 * Orquesta el envío de notificaciones WhatsApp para una clase específica.
 *
 * @param {Array<{ studentId: string, present: boolean }>} registros
 * @param {string} idCurso
 * @param {string} fecha  - Formato YYYY-MM-DD
 */
export async function ejecutarNotificacionWhatsAppAusencia(registros, idCurso, fecha) {
    const delayConfigurado = Number(process.env.WHATSAPP_SEND_DELAY_MS ?? 10000);
    // Evita ráfagas muy rápidas que suelen afectar la entregabilidad en WhatsApp.
    const delayEnvioMs = Number.isFinite(delayConfigurado)
        ? Math.max(delayConfigurado, 8000)
        : 10000;

    console.log('\n════════════════════════════════════════');
    console.log('[whatsapp-job] Iniciando notificaciones de ausencia por WhatsApp...');
    console.log(`[whatsapp-job] Curso: ${idCurso} | Fecha: ${fecha}`);
    console.log('════════════════════════════════════════\n');

    const estadisticas = { enviados: 0, omitidos: 0, errores: 0 };

    try {
        // 1. Filtrar solo los ausentes
        const idsAusentes = registros
            .filter(r => !r.present)
            .map(r => r.studentId);

        if (idsAusentes.length === 0) {
            console.log('[whatsapp-job] No hay estudiantes ausentes. Nada que enviar.');
            return;
        }

        // 2. Obtener datos de estudiantes + nombre del curso en un solo query
        const [estudiantes, curso] = await Promise.all([
            prisma.estudiante.findMany({
                where: { documento: { in: idsAusentes } },
                select: { documento: true, name: true, whatsapp: true },
            }),
            prisma.curso.findUnique({
                where: { id: idCurso },
                select: { name: true },
            }),
        ]);

        if (!curso) {
            console.error(`[whatsapp-job] Curso ${idCurso} no encontrado.`);
            return;
        }

        // 3. Procesar cada estudiante
        for (const estudiante of estudiantes) {
            const claveLog = { studentId: estudiante.documento, courseId: idCurso, date: fecha };

            // --- Sin número registrado ---
            if (!estudiante.whatsapp) {
                console.warn(`[whatsapp-job] Sin WhatsApp: ${estudiante.name} (${estudiante.documento})`);
                await prisma.registroNotificacionWhatsapp.upsert({
                    where: { studentId_courseId_date: claveLog },
                    update: { status: 'SKIPPED', error: 'Sin número de WhatsApp', sentAt: new Date() },
                    create: { ...claveLog, status: 'SKIPPED', error: 'Sin número de WhatsApp' },
                });
                estadisticas.omitidos++;
                continue;
            }

            // --- Verificar duplicado: solo omitir si YA fue enviado con éxito ---
            const existente = await prisma.registroNotificacionWhatsapp.findUnique({
                where: { studentId_courseId_date: claveLog },
            });

            if (existente?.status === 'SUCCESS') {
                console.log(`[whatsapp-job] Ya notificado exitosamente: ${estudiante.name} (${fecha}). Omitiendo.`);
                estadisticas.omitidos++;
                continue;
            }

            // --- Construir y enviar mensaje ---
            const mensaje = construirMensajeAusencia({
                studentName: estudiante.name,
                date: fecha,
                courseName: curso.name,
            });

            const resultado = await enviarMensajeWhatsApp({
                phone: estudiante.whatsapp,
                message: mensaje,
            });

            // --- Registrar / actualizar en log ---
            await prisma.registroNotificacionWhatsapp.upsert({
                where: { studentId_courseId_date: claveLog },
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

            // --- Delay entre mensajes para evitar bans ---
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
