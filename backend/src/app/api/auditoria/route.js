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

        const total = await prisma.registroAuditoria.count()

        return Response.json({ logs, total })
    } catch (error) {
        console.error('[Audit API Error]:', error)
        return Response.json({ error: 'Error al obtener logs de auditoría' }, { status: 500 })
    }
}
