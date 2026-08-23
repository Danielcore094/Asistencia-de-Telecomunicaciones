export const dynamic = 'force-dynamic';

import { obtenerUsuarioDePeticion, verificarAccesoCurso } from '@/lib/autenticacion';
import prisma from '@/lib/prisma';
import { ejecutarNotificacionWhatsAppAusencia } from '@/jobs/notificacionWhatsAppAusencia';
import { registrarAccion } from '@/lib/servicioAuditoria';

export async function POST(request) {
    const usuario = obtenerUsuarioDePeticion(request);
    if (!usuario) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { id } = await request.json();
        if (typeof id !== 'string' || !id) {
            return Response.json({ error: 'El registro es requerido' }, { status: 400 });
        }

        const registro = await prisma.registroNotificacionWhatsapp.findUnique({
            where: { id },
            select: { id: true, studentId: true, courseId: true, date: true, status: true },
        });

        if (!registro) {
            return Response.json({ error: 'Registro de WhatsApp no encontrado' }, { status: 404 });
        }

        const acceso = await verificarAccesoCurso(registro.courseId, usuario);
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status });
        }

        if (registro.status !== 'ERROR') {
            return Response.json({ error: 'Solo se pueden reintentar envíos con error' }, { status: 409 });
        }

        const asistencia = await prisma.asistencia.findUnique({
            where: {
                studentId_courseId_date: {
                    studentId: registro.studentId,
                    courseId: registro.courseId,
                    date: registro.date,
                },
            },
            select: { present: true, status: true },
        });

        if (!asistencia || asistencia.present || asistencia.status === 'Justificado') {
            return Response.json({ error: 'El estudiante ya no registra una ausencia notificable' }, { status: 409 });
        }

        await ejecutarNotificacionWhatsAppAusencia(
            [{ studentId: registro.studentId, present: false }],
            registro.courseId,
            registro.date,
        );

        const actualizado = await prisma.registroNotificacionWhatsapp.findUnique({
            where: { id },
            select: { status: true, error: true, sentAt: true },
        });

        await registrarAccion({
            usuario,
            accion: 'REINTENTAR_NOTIFICACION_WHATSAPP',
            target: 'NOTIFICATION',
            targetId: registro.id,
            detalles: {
                estudianteId: registro.studentId,
                cursoId: registro.courseId,
                fecha: registro.date,
                estado: actualizado?.status,
                error: actualizado?.error,
            },
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        return Response.json({
            success: actualizado?.status === 'SUCCESS',
            status: actualizado?.status,
            error: actualizado?.error,
            enviadoEl: actualizado?.sentAt,
        });
    } catch (error) {
        console.error('[whatsapp-retry] Error:', error.message);
        return Response.json({ error: 'Error al reintentar la notificación' }, { status: 500 });
    }
}