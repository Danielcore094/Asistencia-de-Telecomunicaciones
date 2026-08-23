export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion, verificarAccesoCurso } from '@/lib/autenticacion'

const estadosAsistencia = new Set(['Presente', 'Ausente', 'Justificado'])

const esFechaValida = (fecha) => {
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false

    const [anio, mes, dia] = fecha.split('-').map(Number)
    const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia))
    return fechaUtc.getUTCFullYear() === anio && fechaUtc.getUTCMonth() === mes - 1 && fechaUtc.getUTCDate() === dia
}

const construirFiltroCursoAutorizado = (filtroCurso, usuario) => {
    if (usuario.role === 'ADMIN') return filtroCurso

    return {
        AND: [filtroCurso, { teacherId: usuario.id }],
    }
}

function construirFiltro({ nombreMateria, codigo, grupo, docenteId, anio, periodo, modalidad }) {
    const where = {}

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


export async function GET(request) {
    try {
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

        if (!idCurso || (fecha && !esFechaValida(fecha))) {
            return Response.json({ error: 'courseId es requerido' }, { status: 400 })
        }

        const acceso = await verificarAccesoCurso(idCurso, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }
        const cursoBase = acceso.curso

        const whereFiltros = construirFiltro({ nombreMateria: cursoBase.name, codigo, grupo, docenteId, anio, periodo, modalidad })
        const filtroCurso = construirFiltroCursoAutorizado(
            whereFiltros.course || { id: cursoBase.id },
            usuario
        )

        if (!fecha) {
            const cursosFiltrados = await prisma.curso.findMany({
                where: filtroCurso,
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

        const asistencias = await prisma.asistencia.findMany({
            where: { course: filtroCurso, date: fecha },
            include: { student: true }
        })
        return Response.json(asistencias)
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al obtener asistencia' }, { status: 500 })
    }
}


export async function POST(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { date, courseId, records } = await request.json()
        const sonRegistrosValidos = Array.isArray(records) && records.length > 0 && records.length <= 200 && records.every((registro) => (
            registro &&
            typeof registro.studentId === 'string' &&
            registro.studentId.trim().length > 0 &&
            estadosAsistencia.has(registro.status)
        ))
        if (!esFechaValida(date) || typeof courseId !== 'string' || !courseId || !sonRegistrosValidos) {
            return Response.json({ error: 'Datos inválidos en la petición' }, { status: 400 })
        }

        const acceso = await verificarAccesoCurso(courseId, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }

        const operaciones = records.map(registro => {
            const estaPresente = registro.status === 'Presente';
            return prisma.asistencia.upsert({
                where: {
                    studentId_courseId_date: {
                        studentId: registro.studentId,
                        courseId,
                        date
                    }
                },
                update: { present: estaPresente, status: registro.status },
                create: {
                    studentId: registro.studentId,
                    courseId,
                    date,
                    present: estaPresente,
                    status: registro.status,
                }
            })
        })

        await prisma.$transaction(operaciones)
        
        const { registrarAccion } = await import('@/lib/servicioAuditoria');
        registrarAccion({
            usuario,
            accion: 'GUARDAR_ASISTENCIA',
            target: 'ATTENDANCE',
            targetId: courseId,
            detalles: {
                fecha: date,
                totalRegistros: records.length,
                nombreMateria: acceso.curso.name,
                codigoMateria: acceso.curso.code,
                grupo: acceso.curso.groupCode,
            },
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        });

        const ausentes = records.filter(r => r.status === 'Ausente');
        if (ausentes.length > 0) {
            const { ejecutarNotificacionWhatsAppAusencia } = await import('@/jobs/notificacionWhatsAppAusencia');
            setImmediate(() =>
                ejecutarNotificacionWhatsAppAusencia(ausentes, courseId, date)
                    .catch(err => console.error('[attendance-route] Error en job WhatsApp:', err))
            );
        }

        const { ejecutarNotificacionRiesgoPerdidaTemprana } = await import('@/jobs/notificacionRiesgoPerdidaTemprana');
        setImmediate(() =>
            ejecutarNotificacionRiesgoPerdidaTemprana({
                idCurso: courseId,
                idsEstudiantes: records.map((record) => record.studentId),
                fecha: date,
            }).catch(err => console.error('[attendance-route] Error en alerta de posible pérdida:', err))
        );

        return Response.json({ success: true, count: operaciones.length })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al guardar asistencia' }, { status: 500 })
    }
}
