export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'

export async function PUT(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
        if (usuario.role === 'ADMIN') return Response.json({ error: 'El administrador no puede modificar estudiantes' }, { status: 403 })

        const payload = await request.json()
        const { name, email, correo2, whatsapp, telefono2 } = payload
        if (!name || name.trim() === '') {
            return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
        }

        const datosActualizacion = {
            name:      name.trim(),
            email:     email     ? email.trim()     : null,
            correo2:   correo2   ? correo2.trim()   : null,
            whatsapp:  whatsapp  ? whatsapp.trim()  : null,
            telefono2: telefono2 ? telefono2.trim() : null,
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'franja')) {
            const franjaLimpia = payload.franja ? payload.franja.trim() : null
            if (franjaLimpia) {
                datosActualizacion.franja = franjaLimpia
            }
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'programa')) {
            const programaLimpio = payload.programa ? payload.programa.trim() : null
            if (programaLimpio) {
                datosActualizacion.programa = programaLimpio
            }
        }

        const estudiante = await prisma.estudiante.update({
            where: { documento: params.id },
            data: datosActualizacion
        })
        return Response.json({ ...estudiante, id: estudiante.documento })
    } catch (error) {
        return Response.json({ error: 'Error al actualizar estudiante' }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })
        if (usuario.role === 'ADMIN') return Response.json({ error: 'El administrador no puede eliminar estudiantes' }, { status: 403 })

        const { searchParams } = new URL(request.url);
        const idCurso = searchParams.get('courseId');

        if (!idCurso) {
            return Response.json({ error: 'courseId es requerido' }, { status: 400 });
        }

        const estudiante = await prisma.estudiante.findUnique({
            where: { documento: params.id },
            include: { matriculas: true }
        });

        if (!estudiante) {
            return Response.json({ error: 'Estudiante no encontrado' }, { status: 404 });
        }

        if (estudiante.matriculas.length <= 1) {
            await prisma.estudiante.delete({ where: { documento: params.id } });
        } else {
            await prisma.cursoEstudiante.delete({
                where: {
                    cursoId_estudianteId: {
                        cursoId: idCurso,
                        estudianteId: params.id,
                    },
                },
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error(error);
        return Response.json({ error: 'Error al eliminar estudiante' }, { status: 500 });
    }
}
