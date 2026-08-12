export const dynamic = 'force-dynamic';

import { createSemesterSummaryExcel } from '@/lib/attendanceService';
import { obtenerUsuarioDePeticion } from '@/lib/auth';

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }
        if (usuario.role !== 'ADMIN') {
            return Response.json({ error: 'Solo administradores pueden descargar el resumen semestral' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const anio    = searchParams.get('anio')    || undefined;
        const periodo = searchParams.get('periodo') || undefined;

        const buffer = await createSemesterSummaryExcel({ anio, periodo });
        if (!buffer) {
            return Response.json({ error: 'No hay datos de asistencia para generar el reporte' }, { status: 404 });
        }

        try {
            const { registrarAccion } = await import('@/lib/auditService');
            await registrarAccion({
                usuario,
                accion: 'EXPORTAR_REPORTE',
                target: 'REPORT',
                detalles: { tipo: 'resumen_semestral', anio, periodo },
                ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
            });
        } catch (err) {
            console.warn('[Audit] No se pudo registrar log de resumen semestral:', err);
        }

        const nombreArchivo = `Resumen_Semestral_${anio || ''}${periodo ? `-${periodo}` : ''}_${new Date().toISOString().split('T')[0]}.xlsx`;
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
            },
        });
    } catch (error) {
        console.error('Error generando resumen semestral:', error);
        return Response.json({ error: 'Error al generar el resumen semestral' }, { status: 500 });
    }
}
