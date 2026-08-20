export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma'

export async function GET(request) {
    try {
        const asistencias = await prisma.asistencia.findMany({
            include: { student: true },
            orderBy: { date: 'desc' }
        })

        const encabezado = ['ID Estudiante', 'Nombre', 'Fecha', 'Presente', 'Fecha de Registro']

        const escaparCsv = (str) => `"${String(str).replace(/"/g, '""')}"`

        const filas = asistencias.map(a => [
            escaparCsv(a.student.documento),
            escaparCsv(a.student.name),
            escaparCsv(a.date),
            a.present ? 'Sí' : 'No',
            escaparCsv(a.createdAt.toISOString())
        ])

        const contenidoCsv = [encabezado.map(escaparCsv).join(','), ...filas.map(f => f.join(','))].join('\n')

        return new Response(contenidoCsv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="asistencia_exportada.csv"',
            }
        })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al exportar asistencia' }, { status: 500 })
    }
}
