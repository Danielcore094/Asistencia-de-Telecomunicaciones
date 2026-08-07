export const dynamic = 'force-dynamic';

import { obtenerUsuarioDePeticion } from '@/lib/auth'

// POST /api/auditoria/registro
export async function POST(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 403 })

        const body = await request.json()
        const action = body.action || 'EXPORTAR_REPORTE'
        const target = body.target || 'REPORT'
        const details = body.details || {}

        const { registrarAccion } = await import('@/lib/auditService')
        await registrarAccion({
            usuario,
            accion: action,
            target,
            detalles: details,
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        })

        return Response.json({ ok: true })
    } catch (error) {
        console.error('[Audit API] Error creating log:', error)
        return Response.json({ error: 'Error al crear log' }, { status: 500 })
    }
}
