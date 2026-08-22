export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion, verificarAccesoCurso } from '@/lib/autenticacion'

function limpiarTexto(valor) {
    if (valor === null || valor === undefined) return null
    const texto = String(valor).trim()
    return texto === '' ? null : texto
}

const convertirHoraAMinutos = (hora) => {
    if (!hora) return null;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
};

const hayCruce = (curso1, curso2) => {
    const horarios1 = [];
    if (curso1.dia && curso1.horaInicio && curso1.horaFin) horarios1.push({ dia: curso1.dia, inicio: convertirHoraAMinutos(curso1.horaInicio), fin: convertirHoraAMinutos(curso1.horaFin) });
    if (curso1.dia2 && curso1.horaInicio2 && curso1.horaFin2) horarios1.push({ dia: curso1.dia2, inicio: convertirHoraAMinutos(curso1.horaInicio2), fin: convertirHoraAMinutos(curso1.horaFin2) });

    const horarios2 = [];
    if (curso2.dia && curso2.horaInicio && curso2.horaFin) horarios2.push({ dia: curso2.dia, inicio: convertirHoraAMinutos(curso2.horaInicio), fin: convertirHoraAMinutos(curso2.horaFin) });
    if (curso2.dia2 && curso2.horaInicio2 && curso2.horaFin2) horarios2.push({ dia: curso2.dia2, inicio: convertirHoraAMinutos(curso2.horaInicio2), fin: convertirHoraAMinutos(curso2.horaFin2) });

    for (const horario1 of horarios1) {
        for (const horario2 of horarios2) {
            if (horario1.dia === horario2.dia) {
                if (horario1.inicio < horario2.fin && horario1.fin > horario2.inicio) {
                    return true;
                }
            }
        }
    }
    return false;
};

const obtenerCursosMatriculados = (estudiante) =>
    estudiante.matriculas.map((matricula) => matricula.curso);


export async function GET(request) {
    try {
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

        const acceso = await verificarAccesoCurso(idCurso, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }

        const filtroMatricula = { cursoId: idCurso }

        const filtroCurso = {}
        if (codigo)    filtroCurso.code      = codigo
        if (grupo)     filtroCurso.groupCode = grupo
        if (docenteId) filtroCurso.teacherId = docenteId

        if (Object.keys(filtroCurso).length > 0) filtroMatricula.curso = filtroCurso

        const where = { matriculas: { some: filtroMatricula } }

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


export async function POST(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (usuario.role === 'ADMIN') {
            return Response.json({ error: 'El administrador no puede crear estudiantes' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const idCurso = searchParams.get('courseId')

        if (!idCurso) {
            return Response.json({ error: 'courseId es requerido' }, { status: 400 })
        }

        const acceso = await verificarAccesoCurso(idCurso, usuario)
        if (!acceso.permitido) {
            return Response.json({ error: acceso.error }, { status: acceso.status })
        }
        const curso = acceso.curso

        const cuerpo = await request.json()
        if (Array.isArray(cuerpo)) {
            let count = 0;
            for (const e of cuerpo) {
                if (!limpiarTexto(e.name) || !limpiarTexto(e.documento)) continue;

                const docLimpio = limpiarTexto(e.documento);
                
                const estudianteExistente = await prisma.estudiante.findUnique({
                    where: { documento: docLimpio },
                    include: { matriculas: { include: { curso: true } } }
                });

                if (estudianteExistente) {
                    const cursosMatriculados = obtenerCursosMatriculados(estudianteExistente)
                    if (cursosMatriculados.some(c => c.id === curso.id)) continue;

                    for (const cActual of cursosMatriculados) {
                        if (hayCruce(cActual, curso)) {
                            throw new Error(`Cruce de horarios para ${e.name} con la materia ${cActual.name}`);
                        }
                    }
                }

                const franjaEstudiante = limpiarTexto(e.franja);
                await prisma.estudiante.upsert({
                    where: { documento: docLimpio },
                    update: {
                        name: limpiarTexto(e.name),
                        email: limpiarTexto(e.email),
                        whatsapp: limpiarTexto(e.whatsapp),
                        matriculas: { create: { curso: { connect: { id: curso.id } } } }
                    },
                    create: {
                        documento: docLimpio,
                        name: limpiarTexto(e.name),
                        email: limpiarTexto(e.email),
                        whatsapp: limpiarTexto(e.whatsapp),
                        franja: franjaEstudiante,
                        programa: limpiarTexto(e.programa),
                        matriculas: { create: { curso: { connect: { id: curso.id } } } }
                    }
                });
                count++;
            }
            return Response.json({ count }, { status: 201 })
        }

        const { documento, name, email, whatsapp, franja, programa, masivo } = cuerpo
        const documentoLimpio = limpiarTexto(documento)
        const nombreLimpio = limpiarTexto(name)
        const franjaLimpia = limpiarTexto(franja)
        
        if (!documentoLimpio) {
            return Response.json({ error: 'El documento es requerido' }, { status: 400 })
        }
        if (!nombreLimpio) {
            return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
        }

        const estudianteExistente = await prisma.estudiante.findUnique({
            where: { documento: documentoLimpio },
            include: { matriculas: { include: { curso: true } } }
        });

        if (estudianteExistente) {
            const cursosMatriculados = obtenerCursosMatriculados(estudianteExistente)
            if (cursosMatriculados.some(c => c.id === curso.id)) {
                return Response.json({ error: 'El estudiante ya está inscrito en esta materia' }, { status: 400 });
            }
            
            for (const cActual of cursosMatriculados) {
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
                matriculas: { create: { curso: { connect: { id: idCurso } } } }
            },
            create: {
                documento: documentoLimpio,
                name: nombreLimpio,
                email: limpiarTexto(email),
                whatsapp: limpiarTexto(whatsapp),
                franja: franjaLimpia,
                programa: limpiarTexto(programa),
                matriculas: { create: { curso: { connect: { id: idCurso } } } }
            }
        })

        const { registrarAccion } = await import('@/lib/servicioAuditoria');
        registrarAccion({
            usuario,
            accion: 'CREAR_ESTUDIANTE',
            target: 'STUDENT',
            targetId: documentoLimpio,
            detalles: {
                nombreEstudiante: nombreLimpio,
                cursoId: idCurso,
                nombreMateria: curso.name,
                codigoMateria: curso.code,
                masivo: Boolean(masivo),
            },
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        });

        return Response.json({ ...estudiante, id: estudiante.documento }, { status: 201 })
    } catch (error) {
        console.error(error)
        

        const msg = error.message || 'Error al crear estudiante'
        return Response.json({ error: msg }, { status: error.message?.includes('franja') ? 400 : 500 })
    }
}
