export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { crearReporteSemanalPorDocente } from '@/lib/servicioAsistencia'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const idDocente = searchParams.get('teacherId')
        
        if (!idDocente) {
            return Response.json({ error: 'Falta teacherId' }, { status: 400 })
        }

        if (usuario.role !== 'ADMIN' && usuario.id !== idDocente) {
            return Response.json({ error: 'No podés descargar el reporte de otro docente' }, { status: 403 })
        }

        const reporte = await crearReporteSemanalPorDocente({ teacherId: idDocente })
        if (!reporte) {
            return Response.json({ error: 'No se encontró reporte para este docente' }, { status: 404 })
        }

        try {
            const { registrarAccion } = await import('@/lib/servicioAuditoria')
            await registrarAccion({
                usuario,
                accion: 'EXPORTAR_REPORTE',
                target: 'REPORT',
                detalles: {
                    idDocente,
                    nombreDocente: reporte.teacherName,
                    cantidadCursos: reporte.courseCount,
                    semanaInicio: reporte.weekStart,
                    semanaFin: reporte.weekEnd,
                    totalRegistros: reporte.totalRecords,
                },
                ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
            })
        } catch (err) {
            console.warn('[Audit] No se pudo registrar log de descarga:', err)
        }

        const filename = `reporte-${reporte.teacherName.replace(/\s+/g, '-').toLowerCase()}-${reporte.weekStart}.xlsx`
        return new Response(reporte.buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error) {
        console.error('Error descargando reporte:', error)
        return Response.json({ error: 'Error al descargar reporte' }, { status: 500 })
    }
}
