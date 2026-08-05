export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/auth'

export async function PUT(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

        const id = params.id
        const body = await request.json()
        const { name, code, groupCode, academicPeriod, academicYear, dia, horaInicio, horaFin, dia2, horaInicio2, horaFin2, franja, programa } = body

        if (!name || !code || name.trim() === '' || code.trim() === '') {
            return Response.json({ error: 'Nombre y código son requeridos' }, { status: 400 })
        }

        const cursoExistente = await prisma.curso.findUnique({ where: { id } })
        
        if (!cursoExistente) {
            return Response.json({ error: 'Materia no encontrada' }, { status: 404 })
        }

        if (usuario.role === 'ADMIN') {
            return Response.json({ error: 'El administrador no puede modificar materias' }, { status: 403 })
        }

        if (cursoExistente.teacherId !== usuario.id) {
            return Response.json({ error: 'No autorizado para editar esta materia' }, { status: 403 })
        }

        const cursoActualizado = await prisma.curso.update({
            where: { id },
            data: {
                name: name.trim(),
                code: code.trim(),
                groupCode: groupCode?.trim() || 'A',
                academicPeriod: academicPeriod || '1',
                academicYear: academicYear || '2024',
                dia: dia?.trim() || null,
                horaInicio: horaInicio?.trim() || null,
                horaFin: horaFin?.trim() || null,
                dia2: dia2?.trim() || null,
                horaInicio2: horaInicio2?.trim() || null,
                horaFin2: horaFin2?.trim() || null,
                franja: franja?.trim() || null,
                programa: programa?.trim() || null,
            }
        })

        return Response.json(cursoActualizado)
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al actualizar la materia' }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) return Response.json({ error: 'No autorizado' }, { status: 401 })

        const { id } = params

        const existing = await prisma.curso.findUnique({ where: { id } })
        if (!existing) {
            return Response.json({ error: 'Materia no encontrada' }, { status: 404 })
        }

        if (usuario.role === 'ADMIN') {
            return Response.json({ error: 'El administrador no puede eliminar materias' }, { status: 403 })
        }

        if (existing.teacherId !== usuario.id) {
            return Response.json({ error: 'No autorizado para eliminar esta materia' }, { status: 403 })
        }

        await prisma.curso.delete({ where: { id } })
        return Response.json({ success: true })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al eliminar la materia' }, { status: 500 })
    }
}
