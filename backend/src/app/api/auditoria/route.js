export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'

// GET /api/auditoria
// Devuelve los logs de auditoría. Solo para administradores.
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
            .filter((log) => log.target === 'COURSE' && log.targetId)
            .map((log) => log.targetId))]
        const cursos = idsCursos.length > 0
            ? await prisma.curso.findMany({
                where: { id: { in: idsCursos } },
                select: { id: true, numero: true },
            })
            : []
        const numerosPorCurso = new Map(cursos.map((curso) => [
            curso.id,
            String(curso.numero).padStart(6, '0'),
        ]))
        const logsConIdentificador = logs.map((log) => ({
            ...log,
            identificadorEntidad: log.target === 'COURSE'
                ? numerosPorCurso.get(log.targetId) || log.details?.identificadorEntidad || null
                : null,
        }))

        const total = await prisma.registroAuditoria.count()

        return Response.json({ logs: logsConIdentificador, total })
    } catch (error) {
        console.error('[Audit API Error]:', error)
        return Response.json({ error: 'Error al obtener logs de auditoría' }, { status: 500 })
    }
}
