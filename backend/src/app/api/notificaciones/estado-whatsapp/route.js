export const dynamic = 'force-dynamic';

import { obtenerUsuarioDePeticion } from '@/lib/autenticacion';
import { verificarAccesoCurso } from '@/lib/autenticacion';
import prisma from '@/lib/prisma';

export async function GET(request) {
    const usuario = obtenerUsuarioDePeticion(request);
    if (!usuario) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const limite = Math.min(parseInt(searchParams.get('limite') || '50'), 100);
    const cursoId = searchParams.get('cursoId');
    const soloErrores = searchParams.get('soloErrores') === 'true';

    if (usuario.role !== 'ADMIN' && !cursoId) {
        return Response.json({ error: 'cursoId es requerido para docentes' }, { status: 400 });
    }

    if (cursoId) {
        const acceso = await verificarAccesoCurso(cursoId, usuario);
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status });
        }
    }

    const where = {
        ...(cursoId ? { courseId: cursoId } : {}),
        ...(soloErrores ? { status: 'ERROR' } : {}),
    };

    const logs = await prisma.registroNotificacionWhatsapp.findMany({
        where,
        take: limite,
        orderBy: { sentAt: 'desc' },
        include: {
            student: { select: { name: true, whatsapp: true } },
        },
    });

    const courseIds = [...new Set(logs.map(l => l.courseId))];
    const cursos = courseIds.length > 0
        ? await prisma.curso.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, name: true },
        })
        : [];
    const cursoMap = Object.fromEntries(cursos.map(c => [c.id, c.name]));

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
            horario:    l.schedule,
            estudiante: l.student?.name    ?? '—',
            whatsapp:   l.student?.whatsapp ?? '—',
            materia:    cursoMap[l.courseId] ?? '—',
            cursoId:    l.courseId,
        })),
    });
}
