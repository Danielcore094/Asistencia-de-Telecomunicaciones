export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const limiteSolicitado = Number.parseInt(searchParams.get('limit') || '100', 10)
        const desplazamientoSolicitado = Number.parseInt(searchParams.get('offset') || '0', 10)
        const limit = Number.isFinite(limiteSolicitado) ? Math.min(Math.max(limiteSolicitado, 1), 100) : 100
        const offset = Number.isFinite(desplazamientoSolicitado) ? Math.max(desplazamientoSolicitado, 0) : 0
        const busqueda = searchParams.get('search')?.trim() || ''
        const where = busqueda
            ? {
                OR: [
                    { userName: { contains: busqueda, mode: 'insensitive' } },
                    { action: { contains: busqueda, mode: 'insensitive' } },
                    { target: { contains: busqueda, mode: 'insensitive' } },
                    { targetId: { contains: busqueda, mode: 'insensitive' } },
                ],
            }
            : undefined

        const logs = await prisma.registroAuditoria.findMany({
            take: limit,
            skip: offset,
            where,
            orderBy: { createdAt: 'desc' }
        })

        const idsCursos = [...new Set(logs
            .filter((log) => ['COURSE', 'ATTENDANCE'].includes(log.target) && log.targetId)
            .map((log) => log.targetId))]
        const cursos = idsCursos.length > 0
            ? await prisma.curso.findMany({
                where: { id: { in: idsCursos } },
                select: { id: true, numero: true, name: true, code: true, groupCode: true },
            })
            : []
        const cursosPorId = new Map(cursos.map((curso) => [curso.id, curso]))
        const detallesNotificaciones = logs
            .filter((log) => log.action === 'REINTENTAR_NOTIFICACION_WHATSAPP' && log.details)
            .map((log) => (typeof log.details === 'object' ? log.details : {}))
        const idsEstudiantes = [...new Set(detallesNotificaciones
            .map((detalle) => detalle.estudianteId)
            .filter(Boolean))]
        const idsCursosNotificaciones = [...new Set(detallesNotificaciones
            .map((detalle) => detalle.cursoId)
            .filter(Boolean))]
        const [estudiantes, cursosNotificaciones] = await Promise.all([
            idsEstudiantes.length > 0
                ? prisma.estudiante.findMany({
                    where: { documento: { in: idsEstudiantes } },
                    select: { documento: true, name: true },
                })
                : [],
            idsCursosNotificaciones.length > 0
                ? prisma.curso.findMany({
                    where: { id: { in: idsCursosNotificaciones } },
                    select: { id: true, name: true, code: true, groupCode: true },
                })
                : [],
        ])
        const estudiantesPorId = new Map(estudiantes.map((estudiante) => [estudiante.documento, estudiante]))
        const cursosNotificacionesPorId = new Map(cursosNotificaciones.map((curso) => [curso.id, curso]))
        const logsConIdentificador = logs.map((log) => ({
            ...log,
            details: log.action === 'REINTENTAR_NOTIFICACION_WHATSAPP'
                ? {
                    ...(log.details || {}),
                    nombreEstudiante: log.details?.nombreEstudiante
                        || estudiantesPorId.get(log.details?.estudianteId)?.name,
                    nombreMateria: log.details?.nombreMateria
                        || cursosNotificacionesPorId.get(log.details?.cursoId)?.name,
                    codigoMateria: log.details?.codigoMateria
                        || cursosNotificacionesPorId.get(log.details?.cursoId)?.code,
                    grupo: log.details?.grupo
                        || cursosNotificacionesPorId.get(log.details?.cursoId)?.groupCode,
                }
                : ['ATTENDANCE', 'COURSE'].includes(log.target) && cursosPorId.has(log.targetId)
                ? {
                    ...(log.details || {}),
                    ...(log.action === 'ALERTA_POSIBLE_PERDIDA'
                        ? { nombreMateria: log.details?.nombreMateria || cursosPorId.get(log.targetId).name }
                        : {}),
                    ...(log.target === 'ATTENDANCE'
                        ? {
                            nombreMateria: log.details?.nombreMateria || cursosPorId.get(log.targetId).name,
                            codigoMateria: log.details?.codigoMateria || cursosPorId.get(log.targetId).code,
                            grupo: log.details?.grupo || cursosPorId.get(log.targetId).groupCode,
                        }
                        : {}),
                }
                : log.details,
            identificadorEntidad: log.target === 'COURSE'
                && log.action !== 'ALERTA_POSIBLE_PERDIDA'
                ? (cursosPorId.get(log.targetId)
                    ? String(cursosPorId.get(log.targetId).numero).padStart(6, '0')
                    : log.details?.identificadorEntidad || null)
                : null,
        }))

        const total = await prisma.registroAuditoria.count({ where })

        return Response.json({ logs: logsConIdentificador, total })
    } catch (error) {
        console.error('[Audit API Error]:', error)
        return Response.json({ error: 'Error al obtener logs de auditoría' }, { status: 500 })
    }
}
