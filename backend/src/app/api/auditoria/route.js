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

        const total = await prisma.registroAuditoria.count({ where })

        return Response.json({ logs: logsConIdentificador, total })
    } catch (error) {
        console.error('[Audit API Error]:', error)
        return Response.json({ error: 'Error al obtener logs de auditoría' }, { status: 500 })
    }
}
