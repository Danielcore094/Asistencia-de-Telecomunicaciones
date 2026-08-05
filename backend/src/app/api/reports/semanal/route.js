export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma'
import { getLunesSemana } from '@/lib/dateUtils'

// GET — reporte semanal agregado
// Parámetros: courseId?, codigo?, grupo?, docenteId?, anio?, periodo?, modalidad?,
//             startDate?, endDate?
// Requiere al menos: courseId | docenteId | modalidad
export async function GET(request) {
    try {
        const sp          = new URL(request.url).searchParams
        const courseId    = sp.get('courseId')   || null
        const codigo      = sp.get('codigo')     || null
        const grupo       = sp.get('grupo')      || null
        const docenteId   = sp.get('docenteId')  || null
        const anio        = sp.get('anio')        || null
        const periodo     = sp.get('periodo')     || null
        const modalidad   = sp.get('modalidad')  || null
        const startDate   = sp.get('startDate')  || null
        const endDate     = sp.get('endDate')    || null

        const agrupacion  = sp.get('agrupacion') || 'semana' // 'semana' o 'dia'

        if (!courseId && !docenteId && !modalidad) {
            return Response.json(
                { error: 'Se requiere courseId, docenteId o modalidad' },
                { status: 400 }
            )
        }

        // ── WHERE ────────────────────────────────────────────────────────────
        const where = {}
        if (courseId) where.courseId = courseId
        if (startDate || endDate) {
            where.date = {}
            if (startDate) where.date.gte = startDate
            if (endDate)   where.date.lte = endDate
        }

        const fc = {}
        if (codigo)    fc.code           = codigo
        if (grupo)     fc.groupCode      = grupo
        if (docenteId) fc.teacherId      = docenteId
        if (anio)      fc.academicYear   = anio
        if (periodo)   fc.academicPeriod = periodo
        if (modalidad) fc.programa       = { contains: modalidad, mode: 'insensitive' }

        if (Object.keys(fc).length > 0) where.course = fc

        // ── Consulta ─────────────────────────────────────────────────────────
        const registros = await prisma.asistencia.findMany({
            where,
            select: { date: true, present: true, status: true },
            orderBy: { date: 'asc' },
        })

        // ── Agrupar por tiempo ───────────────────────────────────────────────
        const porTiempo = {}
        registros.forEach(({ date, present, status }) => {
            const clave = agrupacion === 'semana' ? getLunesSemana(date) : date
            if (!porTiempo[clave]) {
                porTiempo[clave] = { presente: 0, ausente: 0, justificado: 0 }
            }
            const estado = status || (present ? 'Presente' : 'Ausente');
            if (estado === 'Presente')    porTiempo[clave].presente++
            else if (estado === 'Justificado') porTiempo[clave].justificado++
            else                          porTiempo[clave].ausente++
        })

        const semanas = Object.keys(porTiempo)
            .sort()
            .map((clave, idx) => ({
                semana:      agrupacion === 'semana' ? `Semana ${idx + 1}` : clave,
                fechaLunes:  clave, // en modo dia esto es simplemente la fecha
                ...porTiempo[clave],
            }))

        return Response.json({ semanas })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al generar reporte semanal' }, { status: 500 })
    }
}
