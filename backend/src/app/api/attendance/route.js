export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion, verificarAccesoCurso } from '@/lib/auth'

// Helper: construye la condición WHERE para los filtros opcionales

function construirFiltro({ nombreMateria, codigo, grupo, docenteId, anio, periodo, modalidad }) {
    const where = {}

    // Filtros sobre la relación Course (JOIN implícito de Prisma)
    const filtroCurso = {}
    if (nombreMateria) filtroCurso.name = nombreMateria
    if (modalidad) filtroCurso.programa = { contains: modalidad, mode: 'insensitive' }

    if (codigo)    filtroCurso.code          = codigo
    if (grupo)     filtroCurso.groupCode     = grupo
    if (docenteId) filtroCurso.teacherId     = docenteId
    if (anio)      filtroCurso.academicYear  = anio
    if (periodo)   filtroCurso.academicPeriod = periodo

    if (Object.keys(filtroCurso).length > 0) {
        where.course = filtroCurso
    }

    return where
}

// GET - listar u obtener asistencia según parámetros

export async function GET(request) {
    try {
        // Verificar autenticación
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const fecha     = searchParams.get('date')
        const idCurso   = searchParams.get('courseId')
        const codigo    = searchParams.get('codigo')    || null
        const grupo     = searchParams.get('grupo')     || null
        const docenteId = searchParams.get('docenteId') || null
        const anio      = searchParams.get('anio')      || null
        const periodo   = searchParams.get('periodo')   || null
        const modalidad = searchParams.get('modalidad') || null

        if (!idCurso) {
            return Response.json({ error: 'courseId es requerido' }, { status: 400 })
        }

        // Verificar acceso al curso
        const acceso = await verificarAccesoCurso(idCurso, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }
        const cursoBase = acceso.curso

        const whereFiltros = construirFiltro({ nombreMateria: cursoBase.name, codigo, grupo, docenteId, anio, periodo, modalidad })

        if (!fecha) {
            // Sin fecha: devuelve historial agrupado por día
            const cursosFiltrados = await prisma.curso.findMany({
                where: whereFiltros.course || { name: cursoBase.name },
                select: { id: true },
            })
            const courseIds = cursosFiltrados.map(c => c.id)

            if (courseIds.length === 0) {
                return Response.json([])
            }

            const registros = await prisma.asistencia.findMany({
                where: { courseId: { in: courseIds } },
                select: { date: true, present: true },
                orderBy: { date: 'desc' },
            })

            const mapaHistorial = new Map()
            for (const registro of registros) {
                if (!mapaHistorial.has(registro.date)) {
                    mapaHistorial.set(registro.date, {
                        date: registro.date,
                        total: 0,
                        presentCount: 0,
                    })
                }

                const fila = mapaHistorial.get(registro.date)
                fila.total += 1
                if (registro.present) fila.presentCount += 1
            }

            const historial = Array.from(mapaHistorial.values())

            return Response.json(historial)
        }

        // Con fecha: registros individuales incluyendo datos del estudiante
        const asistencias = await prisma.asistencia.findMany({
            where: { ...whereFiltros, date: fecha },
            include: { student: true }
        })
        return Response.json(asistencias)
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al obtener asistencia' }, { status: 500 })
    }
}

// POST - guardar asistencia de una clase

export async function POST(request) {
    try {
        // Verificar autenticación
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { date, courseId, records } = await request.json()
        // records: Array<{ studentId: string, present: boolean }>
        if (!date || !courseId || !Array.isArray(records)) {
            return Response.json({ error: 'Datos inválidos en la petición' }, { status: 400 })
        }

        // Verificar acceso al curso antes de guardar
        const acceso = await verificarAccesoCurso(courseId, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }

        // Guardar múltiples registros en una sola transacción con upsert
        const operaciones = records.map(registro => {
            // present = true solo para 'Presente'. 'Justificado' y 'Ausente' = false
            const isPresent = registro.status === 'Presente';
            return prisma.asistencia.upsert({
                where: {
                    studentId_courseId_date: {
                        studentId: registro.studentId,
                        courseId,
                        date
                    }
                },
                update: { present: isPresent, status: registro.status },
                create: {
                    studentId: registro.studentId,
                    courseId,
                    date,
                    present: isPresent,
                    status: registro.status,
                }
            })
        })

        await prisma.$transaction(operaciones)
        
        // Registro de auditoría
        const { registrarAccion } = await import('@/lib/auditService');
        registrarAccion({
            usuario,
            accion: 'GUARDAR_ASISTENCIA',
            target: 'ATTENDANCE',
            targetId: courseId,
            detalles: { fecha: date, total_registros: records.length },
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        });

        // Disparar notificaciones WhatsApp solo para 'Ausente' (no Justificado)
        const ausentes = records.filter(r => r.status === 'Ausente');
        if (ausentes.length > 0) {
            const { runAbsenceWhatsAppNotification } = await import('@/jobs/absenceWhatsAppNotification');
            setImmediate(() =>
                runAbsenceWhatsAppNotification(ausentes, courseId, date)
                    .catch(err => console.error('[attendance-route] Error en job WhatsApp:', err))
            );
        }

        return Response.json({ success: true, count: operaciones.length })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al guardar asistencia' }, { status: 500 })
    }
}
