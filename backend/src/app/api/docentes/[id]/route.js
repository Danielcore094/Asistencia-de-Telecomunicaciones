export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'
import bcrypt from 'bcryptjs'
import { obtenerErrorContrasena } from '@/lib/politicaContrasena'
import { esCorreoInstitucional, normalizarCorreo, MENSAJE_CORREO_INSTITUCIONAL } from '@/lib/correoInstitucional'

export async function PUT(request, { params }) {
    try {
        const usuarioAutenticado = obtenerUsuarioDePeticion(request)
        if (!usuarioAutenticado || usuarioAutenticado.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { id } = params
        const { name, email: emailRecibido, role, password } = await request.json()
        const email = normalizarCorreo(emailRecibido)

        if (role !== undefined && !['ADMIN', 'TEACHER', 'ADMIN_TEACHER'].includes(role)) {
            return Response.json({ error: 'El rol debe ser ADMIN, TEACHER o ADMIN_TEACHER' }, { status: 400 })
        }

        if (emailRecibido && !esCorreoInstitucional(email)) {
            return Response.json({ error: MENSAJE_CORREO_INSTITUCIONAL }, { status: 400 })
        }

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
        if (role) {
            const usuarioObjetivo = await prisma.docente.findUnique({ where: { id }, select: { role: true } })
            if (!usuarioObjetivo) {
                return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
            }

            const tienePrivilegiosAdmin = usuarioObjetivo.role === 'ADMIN' || usuarioObjetivo.role === 'ADMIN_TEACHER'
            const pierdePrivilegiosAdmin = role === 'TEACHER'
            if (tienePrivilegiosAdmin && pierdePrivilegiosAdmin) {
                const cantidadAdministradores = await prisma.docente.count({ where: { role: { in: ['ADMIN', 'ADMIN_TEACHER'] } } })
                if (cantidadAdministradores <= 1) {
                    return Response.json({ error: 'Debe existir al menos un administrador' }, { status: 400 })
                }
            }

            data.role = role
        }
        if (password) {
            const errorContrasena = obtenerErrorContrasena(password)
            if (errorContrasena) {
                return Response.json({ error: errorContrasena }, { status: 400 })
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

        const usuarioObjetivo = await prisma.docente.findUnique({ where: { id }, select: { role: true } })
        if (!usuarioObjetivo) {
            return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        const tienePrivilegiosAdmin = usuarioObjetivo.role === 'ADMIN' || usuarioObjetivo.role === 'ADMIN_TEACHER'
        if (tienePrivilegiosAdmin) {
            const cantidadAdministradores = await prisma.docente.count({ where: { role: { in: ['ADMIN', 'ADMIN_TEACHER'] } } })
            if (cantidadAdministradores <= 1) {
                return Response.json({ error: 'Debe existir al menos un administrador' }, { status: 400 })
            }
        }

        await prisma.docente.delete({ where: { id } })
        return Response.json({ success: true })
    } catch (error) {
        console.error('[Delete Teacher Error]', error)
        return Response.json({ error: 'Error al eliminar profesor' }, { status: 500 })
    }
}
