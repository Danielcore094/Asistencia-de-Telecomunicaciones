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
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        const logs = await prisma.registroAuditoria.findMany({
            take: limit,
            skip: offset,
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
        const logsConIdentificador = logs.map((log) => ({
            ...log,
            details: ['ATTENDANCE', 'COURSE'].includes(log.target) && cursosPorId.has(log.targetId)
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

        const total = await prisma.registroAuditoria.count()

        return Response.json({ logs: logsConIdentificador, total })
    } catch (error) {
        console.error('[Audit API Error]:', error)
        return Response.json({ error: 'Error al obtener logs de auditoría' }, { status: 500 })
    }
}
