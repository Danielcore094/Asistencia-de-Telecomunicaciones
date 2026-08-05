export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion, verificarAccesoCurso } from '@/lib/auth'

function limpiarTexto(valor) {
    if (valor === null || valor === undefined) return null
    const texto = String(valor).trim()
    return texto === '' ? null : texto
}

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const hayCruce = (c1, c2) => {
    const horarios1 = [];
    if (c1.dia && c1.horaInicio && c1.horaFin) horarios1.push({ dia: c1.dia, start: parseTime(c1.horaInicio), end: parseTime(c1.horaFin) });
    if (c1.dia2 && c1.horaInicio2 && c1.horaFin2) horarios1.push({ dia: c1.dia2, start: parseTime(c1.horaInicio2), end: parseTime(c1.horaFin2) });

    const horarios2 = [];
    if (c2.dia && c2.horaInicio && c2.horaFin) horarios2.push({ dia: c2.dia, start: parseTime(c2.horaInicio), end: parseTime(c2.horaFin) });
    if (c2.dia2 && c2.horaInicio2 && c2.horaFin2) horarios2.push({ dia: c2.dia2, start: parseTime(c2.horaInicio2), end: parseTime(c2.horaFin2) });

    for (const h1 of horarios1) {
        for (const h2 of horarios2) {
            if (h1.dia === h2.dia) {
                // Cruce: empiezan antes de que termine el otro, y terminan después de que empiece el otro
                if (h1.start < h2.end && h1.end > h2.start) {
                    return true;
                }
            }
        }
    }
    return false;
};

// GET - obtener lista de estudiantes de un curso con filtros opcionales

export async function GET(request) {
    try {
        // Verificar autenticación
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const idCurso   = searchParams.get('courseId')
        const codigo    = searchParams.get('codigo')    || null
        const grupo     = searchParams.get('grupo')     || null
        const docenteId = searchParams.get('docenteId') || null

        if (!idCurso) {
            return Response.json({ error: 'courseId es requerido' }, { status: 400 })
        }

        // Verificar que el docente tenga acceso a esta materia
        const acceso = await verificarAccesoCurso(idCurso, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }

        // Condición WHERE base sobre Student (relación N:M con courses)
        const where = { courses: { some: { id: idCurso } } }

        // Filtros adicionales a través de la relación Course
        const filtroCurso = {}
        if (codigo)    filtroCurso.code      = codigo
        if (grupo)     filtroCurso.groupCode = grupo
        if (docenteId) filtroCurso.teacherId = docenteId

        if (Object.keys(filtroCurso).length > 0) {
            where.courses = { some: { ...where.courses.some, ...filtroCurso } }
        }

        const estudiantes = await prisma.estudiante.findMany({
            where,
            orderBy: { name: 'asc' }
        })
        return Response.json(estudiantes.map((estudiante) => ({
            ...estudiante,
            id: estudiante.documento,
        })))
    } catch (error) {
        return Response.json({ error: 'Error al obtener estudiantes' }, { status: 500 })
    }
}

// POST - crear uno o múltiples estudiantes (importación CSV)

export async function POST(request) {
    try {
        // Verificar autenticación
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        // El ADMIN solo puede visualizar, no crear estudiantes.
        if (usuario.role === 'ADMIN') {
            return Response.json({ error: 'El administrador no puede crear estudiantes' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const idCurso = searchParams.get('courseId')

        if (!idCurso) {
            return Response.json({ error: 'courseId es requerido' }, { status: 400 })
        }

        // Verificar que el docente tenga acceso a esta materia
        const acceso = await verificarAccesoCurso(idCurso, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }
        const curso = acceso.curso

        const cuerpo = await request.json()
        // Soporte para inserción masiva o individual de CSV no está completamente cubierto aquí con cruces de horarios.
        // Asumiremos que el CSV requiere lógica similar pero iterativa.
        if (Array.isArray(cuerpo)) {
            let count = 0;
            for (const e of cuerpo) {
                if (!limpiarTexto(e.name) || !limpiarTexto(e.documento)) continue;
                
                const franjaEstudiante = limpiarTexto(e.franja);
                if (curso.franja && franjaEstudiante && curso.franja !== franjaEstudiante) {
                    throw new Error(`El estudiante ${e.name} es de franja ${franjaEstudiante} pero la materia es ${curso.franja}`);
                }

                const docLimpio = limpiarTexto(e.documento);
                
                // Verificar si existe el estudiante con sus cursos actuales
                const estudianteExistente = await prisma.estudiante.findUnique({
                    where: { documento: docLimpio },
                    include: { courses: true }
                });

                if (estudianteExistente) {
                    // Verificar si ya está en la materia
                    if (estudianteExistente.courses.some(c => c.id === curso.id)) continue;

                    // Verificar cruce de horarios
                    for (const cActual of estudianteExistente.courses) {
                        if (hayCruce(cActual, curso)) {
                            throw new Error(`Cruce de horarios para ${e.name} con la materia ${cActual.name}`);
                        }
                    }
                }

                await prisma.estudiante.upsert({
                    where: { documento: docLimpio },
                    update: {
                        name: limpiarTexto(e.name),
                        email: limpiarTexto(e.email),
                        whatsapp: limpiarTexto(e.whatsapp),
                        courses: { connect: { id: curso.id } }
                    },
                    create: {
                        documento: docLimpio,
                        name: limpiarTexto(e.name),
                        email: limpiarTexto(e.email),
                        whatsapp: limpiarTexto(e.whatsapp),
                        franja: franjaEstudiante,
                        programa: limpiarTexto(e.programa),
                        courses: { connect: { id: curso.id } }
                    }
                });
                count++;
            }
            return Response.json({ count }, { status: 201 })
        }

        const { documento, name, email, whatsapp, franja, programa } = cuerpo
        const documentoLimpio = limpiarTexto(documento)
        const nombreLimpio = limpiarTexto(name)
        const franjaLimpia = limpiarTexto(franja)
        
        if (!documentoLimpio) {
            return Response.json({ error: 'El documento es requerido' }, { status: 400 })
        }
        if (!nombreLimpio) {
            return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
        }

        if (curso.franja && franjaLimpia && curso.franja !== franjaLimpia) {
            return Response.json({ error: `La materia es de franja ${curso.franja} pero el estudiante es de franja ${franjaLimpia}` }, { status: 400 })
        }

        const estudianteExistente = await prisma.estudiante.findUnique({
            where: { documento: documentoLimpio },
            include: { courses: true }
        });

        if (estudianteExistente) {
            // Verificar si ya está en esta materia
            if (estudianteExistente.courses.some(c => c.id === curso.id)) {
                return Response.json({ error: 'El estudiante ya está inscrito en esta materia' }, { status: 400 });
            }
            
            // Validar cruce
            for (const cActual of estudianteExistente.courses) {
                if (hayCruce(cActual, curso)) {
                    return Response.json({ error: `Cruce de horarios detectado con la materia: ${cActual.name}` }, { status: 400 });
                }
            }
        }

        const estudiante = await prisma.estudiante.upsert({
            where: { documento: documentoLimpio },
            update: {
                name: nombreLimpio,
                email: limpiarTexto(email),
                whatsapp: limpiarTexto(whatsapp),
                courses: { connect: { id: idCurso } }
            },
            create: {
                documento: documentoLimpio,
                name: nombreLimpio,
                email: limpiarTexto(email),
                whatsapp: limpiarTexto(whatsapp),
                franja: franjaLimpia,
                programa: limpiarTexto(programa),
                courses: { connect: { id: idCurso } }
            }
        })

        // Registro de auditoría
        const { registrarAccion } = await import('@/lib/auditService');
        registrarAccion({
            usuario,
            accion: 'CREAR_ESTUDIANTE',
            target: 'STUDENT',
            targetId: documentoLimpio,
            detalles: { cursoId: idCurso, masivo: Array.isArray(cuerpo) },
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        });

        return Response.json({ ...estudiante, id: estudiante.documento }, { status: 201 })
    } catch (error) {
        console.error(error)
        
        // Ya no deberíamos tener P2002 por documento duplicado porque usamos upsert

        const msg = error.message || 'Error al crear estudiante'
        return Response.json({ error: msg }, { status: error.message?.includes('franja') ? 400 : 500 })
    }
}
