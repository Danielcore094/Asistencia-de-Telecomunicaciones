export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// PUT — actualizar un profesor (solo ADMIN)
export async function PUT(request, { params }) {
    try {
        const usuarioAutenticado = obtenerUsuarioDePeticion(request)
        if (!usuarioAutenticado || usuarioAutenticado.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { id } = params
        const { name, email, role, password } = await request.json()

        // Validar si el email ya existe en otro usuario
        if (email) {
            const existente = await prisma.docente.findFirst({
                where: { 
                    email,
                    NOT: { id }
                }
            })
            if (existente) {
                return Response.json({ error: 'El email ya está en uso por otro usuario' }, { status: 409 })
            }
        }

        const data = {}
        if (name) data.name = name
        if (email) data.email = email
        if (role) data.role = role
        if (password) {
            if (password.length < 8) {
                return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
            }
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
            if (!passwordRegex.test(password)) {
                return Response.json({ error: 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales' }, { status: 400 })
            }
            data.passwordHash = await bcrypt.hash(password, 10)
        }

        const profesorActualizado = await prisma.docente.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, createdAt: true, role: true }
        })

        return Response.json(profesorActualizado)
    } catch (error) {
        console.error('[Update Teacher Error]', error)
        return Response.json({ error: 'Error al actualizar profesor' }, { status: 500 })
    }
}

// DELETE — eliminar un profesor (solo ADMIN)
export async function DELETE(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { id } = params
        if (id === usuario.id) {
            return Response.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
        }

        await prisma.docente.delete({ where: { id } })
        return Response.json({ success: true })
    } catch (error) {
        console.error('[Delete Teacher Error]', error)
        return Response.json({ error: 'Error al eliminar profesor' }, { status: 500 })
    }
}
