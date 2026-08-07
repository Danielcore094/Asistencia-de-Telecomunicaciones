export const dynamic = 'force-dynamic';

import { obtenerUsuarioDePeticion } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/notificaciones/estado-whatsapp
 * Devuelve el historial reciente de notificaciones WhatsApp.
 * Solo accesible por ADMIN.
 */
export async function GET(request) {
    const usuario = obtenerUsuarioDePeticion(request);
    if (!usuario) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (usuario.role !== 'ADMIN') {
        return Response.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limite = Math.min(parseInt(searchParams.get('limite') || '50'), 100);

    // Últimos N registros de WhatsApp ordenados por envío más reciente
    const logs = await prisma.registroNotificacionWhatsapp.findMany({
        take: limite,
        orderBy: { sentAt: 'desc' },
        include: {
            student: { select: { name: true, whatsapp: true } },
        },
    });

    // Obtener nombres de cursos para los logs (courseIds únicos)
    const courseIds = [...new Set(logs.map(l => l.courseId))];
    const cursos = courseIds.length > 0
        ? await prisma.curso.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, name: true },
        })
        : [];
    const cursoMap = Object.fromEntries(cursos.map(c => [c.id, c.name]));

    // Resumen global
    const [totalEnviados, totalErrores, totalOmitidos] = await Promise.all([
        prisma.registroNotificacionWhatsapp.count({ where: { status: 'SUCCESS' } }),
        prisma.registroNotificacionWhatsapp.count({ where: { status: 'ERROR'   } }),
        prisma.registroNotificacionWhatsapp.count({ where: { status: 'SKIPPED' } }),
    ]);

    return Response.json({
        resumen: {
            enviados: totalEnviados,
            errores:  totalErrores,
            omitidos: totalOmitidos,
        },
        logs: logs.map(l => ({
            id:         l.id,
            fecha:      l.date,
            enviadoEl:  l.sentAt,
            status:     l.status,
            error:      l.error,
            estudiante: l.student?.name    ?? '—',
            whatsapp:   l.student?.whatsapp ?? '—',
            materia:    cursoMap[l.courseId] ?? '—',
        })),
    });
}
