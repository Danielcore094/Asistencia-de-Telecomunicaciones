export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion, verificarAccesoCurso } from '@/lib/autenticacion'

const SEMANAS_PERIODO = 16
const MINUTOS_HORA_ACADEMICA = 45

const convertirHoraAMinutos = (valor) => {
    if (!valor || typeof valor !== 'string') return null
    const [h, m] = valor.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
}

const calcularMinutosSesion = (inicio, fin) => {
    const ini = convertirHoraAMinutos(inicio)
    const fn = convertirHoraAMinutos(fin)
    if (ini === null || fn === null || fn <= ini) return 0
    return fn - ini
}

const clasesPeriodoCurso = (curso) => {
    if (!curso) return 0
    const minutosSemana =
        calcularMinutosSesion(curso.horaInicio, curso.horaFin) +
        calcularMinutosSesion(curso.horaInicio2, curso.horaFin2)

    if (minutosSemana <= 0) return 0

    const horasAcademicasSemana = Math.round(minutosSemana / MINUTOS_HORA_ACADEMICA)
    return horasAcademicasSemana * SEMANAS_PERIODO
}

const calcularUmbralPerdida = (totalClasesPeriodo) => {
    if (!totalClasesPeriodo || totalClasesPeriodo <= 0) return 0
    return Math.ceil(totalClasesPeriodo * 0.2)
}

const normalizarDia = (dia) => {
    if (!dia || typeof dia !== 'string') return null
    return dia
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

const diaSemanaDesdeFecha = (fecha) => {
    if (!fecha || typeof fecha !== 'string') return null
    const d = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(d.getTime())) return null
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    return dias[d.getDay()]
}

const unidadesRegistro = (curso, fecha) => {
    if (!curso) return 1

    const duracionDia1 = Math.max(1, Math.round(calcularMinutosSesion(curso.horaInicio, curso.horaFin) / MINUTOS_HORA_ACADEMICA))
    const duracionDia2 = Math.max(0, Math.round(calcularMinutosSesion(curso.horaInicio2, curso.horaFin2) / MINUTOS_HORA_ACADEMICA))
    const diaRegistro = diaSemanaDesdeFecha(fecha)
    const dia1 = normalizarDia(curso.dia)
    const dia2 = normalizarDia(curso.dia2)

    if (diaRegistro && dia1 && diaRegistro === dia1) return duracionDia1
    if (diaRegistro && dia2 && diaRegistro === dia2) return duracionDia2 > 0 ? duracionDia2 : 1

    if (duracionDia2 > 0) return Math.max(duracionDia1, duracionDia2)
    return duracionDia1 > 0 ? duracionDia1 : 1
}

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const fechaInicio = searchParams.get('startDate')
        const fechaFin    = searchParams.get('endDate')
        const idCurso     = searchParams.get('courseId')
        const codigo      = searchParams.get('codigo')    || null
        const grupo       = searchParams.get('grupo')     || null
        const docenteId   = searchParams.get('docenteId') || null
        const anio        = searchParams.get('anio')      || null
        const periodo     = searchParams.get('periodo')   || null

        if (!idCurso && !docenteId && !anio) {
            return Response.json({ error: 'Se requiere courseId, docenteId o anio' }, { status: 400 })
        }

        if (usuario.role !== 'ADMIN') {
            if (idCurso) {
                const acceso = await verificarAccesoCurso(idCurso, usuario)
                if (!acceso.permitido) {
                    return Response.json({ error: acceso.error }, { status: acceso.status })
                }
            }
            if (docenteId && docenteId !== usuario.id) {
                return Response.json({ error: 'No podés ver reportes de otro docente' }, { status: 403 })
            }
        }

        const filtroFecha = {}
        if (anio && periodo && !fechaInicio && !fechaFin) {
            if (periodo === '1') {
                filtroFecha.gte = `${anio}-01-01`
                filtroFecha.lte = `${anio}-06-30`
            } else {
                filtroFecha.gte = `${anio}-07-01`
                filtroFecha.lte = `${anio}-12-31`
            }
        } else {
            if (fechaInicio) filtroFecha.gte = fechaInicio
            if (fechaFin)    filtroFecha.lte = fechaFin
        }

        const condicion = {}
        if (idCurso) condicion.courseId = idCurso
        if (Object.keys(filtroFecha).length > 0) {
            condicion.date = filtroFecha
        }

        const filtroCurso = {}
        if (codigo)    filtroCurso.code           = codigo
        if (grupo)     filtroCurso.groupCode       = grupo
        if (docenteId) filtroCurso.teacherId       = docenteId
        if (anio)      filtroCurso.academicYear    = anio
        if (periodo)   filtroCurso.academicPeriod  = periodo

        if (Object.keys(filtroCurso).length > 0) {
            condicion.course = filtroCurso
        }

        const asistencias = await prisma.asistencia.findMany({
            where: condicion,
            include: {
                student: true,
                course: {
                    select: {
                        id: true,
                        dia: true,
                        dia2: true,
                        horaInicio: true,
                        horaFin: true,
                        horaInicio2: true,
                        horaFin2: true,
                    }
                }
            }
        })

        const estadisticasPorEstudiante = {}
        const cursosPorId = {}

        asistencias.forEach(reg => {
            const idEst = reg.student.documento
            if (!estadisticasPorEstudiante[idEst]) {
                estadisticasPorEstudiante[idEst] = {
                    id:          idEst,
                    name:        reg.student.name,
                    total:       0,
                    present:     0,
                    absent:      0,
                    justified:   0,
                    presentUnits: 0,
                    absentUnits:  0,
                    cursos:      new Set(),
                }
            }
            if (reg.course?.id) {
                estadisticasPorEstudiante[idEst].cursos.add(reg.course.id)
                if (!cursosPorId[reg.course.id]) cursosPorId[reg.course.id] = reg.course
            }
            const unidades = unidadesRegistro(reg.course, reg.date)
            const estado = reg.status || (reg.present ? 'Presente' : 'Ausente');
            estadisticasPorEstudiante[idEst].total += 1
            if (estado === 'Presente') {
                estadisticasPorEstudiante[idEst].present += 1
                estadisticasPorEstudiante[idEst].presentUnits += unidades
            }
            else if (estado === 'Justificado') {
                estadisticasPorEstudiante[idEst].justified += 1
            }
            else {
                estadisticasPorEstudiante[idEst].absent += unidades
                estadisticasPorEstudiante[idEst].absentUnits += unidades
            }
        })

        const resultado = Object.values(estadisticasPorEstudiante).map(est => {
            const clasesQueCuentanUnidades = est.presentUnits + est.absentUnits;
            const percentage = clasesQueCuentanUnidades > 0
                ? Math.round((est.presentUnits / clasesQueCuentanUnidades) * 100)
                : 100;

            const totalClasesPeriodo = Array.from(est.cursos)
                .reduce((acc, idCursoEst) => acc + clasesPeriodoCurso(cursosPorId[idCursoEst]), 0)

            const umbralPerdida = totalClasesPeriodo > 0
                ? calcularUmbralPerdida(totalClasesPeriodo)
                : calcularUmbralPerdida(clasesQueCuentanUnidades)

            const absencesAllowed = umbralPerdida > 0 ? umbralPerdida - 1 : 0

            return {
                ...est,
                cursos: undefined,
                presentUnits: undefined,
                absentUnits: undefined,
                percentage,
                absencesAllowed,
                failedByAbsence: umbralPerdida > 0 ? est.absent >= umbralPerdida : false,
            };
        }).sort((a, b) => b.percentage - a.percentage)

        return Response.json(resultado)
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al generar reporte' }, { status: 500 })
    }
}
