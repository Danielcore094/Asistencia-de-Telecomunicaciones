export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'

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

// GET — endpoint dedicado para generar la data del Excel de reportes con filtros
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

        // Filtro de fechas — si se pasa anio/periodo, derivar fechas automáticamente
        const filtroFecha = {}
        if (anio && periodo && !fechaInicio && !fechaFin) {
            // Período 1: 01/01 → 30/06 | Período 2: 01/07 → 31/12
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

        // Condición WHERE base
        const condicion = {}
        if (idCurso) condicion.courseId = idCurso
        if (Object.keys(filtroFecha).length > 0) {
            condicion.date = filtroFecha
        }

        // Filtros opcionales sobre la relación Course
        const filtroCurso = {}
        if (codigo)    filtroCurso.code           = codigo
        if (grupo)     filtroCurso.groupCode      = grupo
        if (docenteId) filtroCurso.teacherId      = docenteId
        if (anio)      filtroCurso.academicYear   = anio
        if (periodo)   filtroCurso.academicPeriod = periodo

        if (Object.keys(filtroCurso).length > 0) {
            condicion.course = filtroCurso
        }

        const asistencias = await prisma.asistencia.findMany({
            where: condicion,
            include: { 
                student: true,
                course: true
            }
        })

        // Estructuras de datos para las hojas del Excel
        const estadisticasGenerales = {}
        const estadisticasPorAsignatura = {}
        const contactoEstudiantes = {}

        asistencias.forEach(reg => {
            const documentoEstudiante = reg.student.documento
            const idCursoActual = reg.courseId
            const estado = reg.status || (reg.present ? 'Presente' : 'Ausente')
            const unidades = unidadesRegistro(reg.course, reg.date)

            // 1. Resumen General
            if (!estadisticasGenerales[documentoEstudiante]) {
                estadisticasGenerales[documentoEstudiante] = {
                    documento: documentoEstudiante,
                    name: reg.student.name,
                    total: 0,
                    present: 0,
                    absent: 0,
                    justified: 0,
                    presentUnits: 0,
                    absentUnits: 0,
                }
            }
            estadisticasGenerales[documentoEstudiante].total += 1
            if (estado === 'Presente') {
                estadisticasGenerales[documentoEstudiante].present += 1
                estadisticasGenerales[documentoEstudiante].presentUnits += unidades
            }
            else if (estado === 'Justificado') {
                estadisticasGenerales[documentoEstudiante].justified += 1
            }
            else {
                estadisticasGenerales[documentoEstudiante].absent += unidades
                estadisticasGenerales[documentoEstudiante].absentUnits += unidades
            }

            // 2. Por Asignatura
            const claveAsignatura = `${documentoEstudiante}-${idCursoActual}`
            if (!estadisticasPorAsignatura[claveAsignatura]) {
                estadisticasPorAsignatura[claveAsignatura] = {
                    documento: documentoEstudiante,
                    estudiante: reg.student.name,
                    asignatura: reg.course.name,
                    codigo: reg.course.code,
                    grupo: reg.course.groupCode,
                    horaInicio: reg.course.horaInicio,
                    horaFin: reg.course.horaFin,
                    horaInicio2: reg.course.horaInicio2,
                    horaFin2: reg.course.horaFin2,
                    total: 0,
                    present: 0,
                    absent: 0,
                    justified: 0,
                    presentUnits: 0,
                    absentUnits: 0,
                }
            }
            estadisticasPorAsignatura[claveAsignatura].total += 1
            if (estado === 'Presente') {
                estadisticasPorAsignatura[claveAsignatura].present += 1
                estadisticasPorAsignatura[claveAsignatura].presentUnits += unidades
            }
            else if (estado === 'Justificado') {
                estadisticasPorAsignatura[claveAsignatura].justified += 1
            }
            else {
                estadisticasPorAsignatura[claveAsignatura].absent += unidades
                estadisticasPorAsignatura[claveAsignatura].absentUnits += unidades
            }

            // 3. Directorio de Contacto (incluir si alguna vez falló, no importando si es justificado o no, para asegurar tener su dato en la BD si entra en riesgo)
            // Se filtrará al final solo los que tengan porcentaje de la asignatura <= 80
            contactoEstudiantes[documentoEstudiante] = {
                documento: documentoEstudiante,
                name: reg.student.name,
                email: reg.student.email || 'No registrado',
                correo2: reg.student.correo2 || 'No registrado',
                whatsapp: reg.student.whatsapp || 'No registrado',
                telefono2: reg.student.telefono2 || 'No registrado'
            }
        })

        const calcPorcentaje = (est) => {
            const clasesQueCuentan = (est.presentUnits ?? est.present) + (est.absentUnits ?? est.absent)
            const presentes = est.presentUnits ?? est.present
            return clasesQueCuentan > 0 ? Math.round((presentes / clasesQueCuentan) * 100) : 100
        }

        const calcFaltasPermitidas = (est) => {
            const totalClasesPeriodo = clasesPeriodoCurso(est)
            const umbral = totalClasesPeriodo > 0
                ? calcularUmbralPerdida(totalClasesPeriodo)
                : calcularUmbralPerdida((est.presentUnits ?? est.present) + (est.absentUnits ?? est.absent))
            return umbral > 0 ? umbral - 1 : 0
        }

        const asignaturas = Object.values(estadisticasPorAsignatura).map(est => {
            const absencesAllowed = calcFaltasPermitidas(est)
            const totalClasesPeriodo = clasesPeriodoCurso(est)
            const umbralPerdida = totalClasesPeriodo > 0
                ? calcularUmbralPerdida(totalClasesPeriodo)
                : calcularUmbralPerdida((est.presentUnits ?? est.present) + (est.absentUnits ?? est.absent))

            const {
                horaInicio,
                horaFin,
                horaInicio2,
                horaFin2,
                presentUnits,
                absentUnits,
                ...estLimpio
            } = est

            return {
                ...estLimpio,
                percentage: calcPorcentaje(est),
                absencesAllowed,
                failedByAbsence: umbralPerdida > 0 ? est.absent >= umbralPerdida : false,
            }
        }).sort((a, b) => a.estudiante.localeCompare(b.estudiante))

        const estudiantesConPérdidaPorFalta = new Set(
            asignaturas.filter(est => est.failedByAbsence).map(est => est.documento)
        )

        const resumen = Object.values(estadisticasGenerales).map(est => ({
            ...est,
            percentage: calcPorcentaje(est),
            failedByAbsence: estudiantesConPérdidaPorFalta.has(est.documento),
        })).sort((a, b) => b.percentage - a.percentage) // de mayor a menor asistencia

        // Filtrar <= 80% o con pérdida por faltas
        const enRiesgo = resumen.filter(est => est.percentage <= 80 || est.failedByAbsence)

        // El directorio solo debe incluir a estudiantes que aparecen en "enRiesgo" o tienen alguna materia perdida (<80)
        // Pero para ser más exactos, el usuario pidió "la informacion de contacto del estudiante que presenta fallas"
        // Si presenta al menos 1 falla (ausencia), lo metemos.
        const estudiantesConFallas = new Set(
            Object.values(statsAsignatura).filter(est => est.absent > 0).map(e => e.documento)
        )

        const directorio = Object.values(contactoEstudiantes)
            .filter(est => estudiantesConFallas.has(est.documento))
            .sort((a, b) => a.name.localeCompare(b.name))

        // Enriquecer detalles con información del docente (si está disponible)
        let informacionDocente = null;
        let nombreCurso = null;
        try {
            // Solo incluir docente cuando la petición explícita incluya `docenteId`
            if (docenteId) {
                const d = await prisma.user.findUnique({ where: { id: docenteId } });
                if (d) informacionDocente = { id: d.id, name: d.name, email: d.email };
            }

            // Obtener nombre del curso cuando se pasó `courseId` (no implica incluir docente)
            if (idCurso) {
                const curso = await prisma.curso.findUnique({ where: { id: idCurso } });
                if (curso) {
                    nombreCurso = curso.name || null;
                }
            }
        } catch (e) {
            // No bloquear el proceso si falla la búsqueda del docente
            console.error('[Audit] Error al obtener info de docente para auditoría:', e);
        }

        // Registro de auditoría (opcional: puede suprimirse con ?suppressAudit=1)
        const valorSuppressAudit = (searchParams.get('suppressAudit') || '').toString().toLowerCase();
        const valorSuppressAuditHeader = (request.headers.get('x-suppress-audit') || '').toString().toLowerCase();
        const suprimirAuditoria = ['1', 'true', 'yes'].includes(valorSuppressAudit) || ['1', 'true', 'yes'].includes(valorSuppressAuditHeader);
        if (!suprimirAuditoria) {
            const { registrarAccion } = await import('@/lib/servicioAuditoria');
            await registrarAccion({
                usuario,
                accion: 'EXPORTAR_REPORTE',
                target: 'REPORT',
                detalles: {
                    cursoId: idCurso,
                    nombreCurso,
                    codigo,
                    grupo,
                    fechaInicio,
                    fechaFin,
                    docente: informacionDocente,
                    totalEstudiantes: resumen.length
                },
                ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
            });
        }

        return Response.json({
            resumen,
            enRiesgo,
            asignaturas,
            directorio
        })

    } catch (error) {
        console.error('Error al generar data para exportar:', error)
        return Response.json({ error: 'Error al generar data del Excel' }, { status: 500 })
    }
}
