export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { obtenerUsuarioDePeticion } from '@/lib/auth'

// GET — listar profesores (ADMIN: todos, TEACHER: solo él mismo)
export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const whereClause = usuario.role === 'ADMIN' ? {} : { id: usuario.id }

        const profesores = await prisma.docente.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, createdAt: true, role: true },
            orderBy: { createdAt: 'asc' }
        })
        return Response.json(profesores)
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al obtener profesores' }, { status: 500 })
    }
}

// POST — crear un profesor (solo ADMIN)
export async function POST(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { documento, name, email, password, role } = await request.json()

        if (!documento || !name || !email || !password) {
            return Response.json({ error: 'Documento, nombre, email y contraseña son requeridos' }, { status: 400 })
        }

        if (!/^\d{6,10}$/.test(String(documento))) {
            return Response.json({ error: 'El documento debe tener entre 6 y 10 numeros' }, { status: 400 })
        }

        if (password.length < 8) {
            return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return Response.json({ error: 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales' }, { status: 400 })
        }

        const existentePorDocumento = await prisma.docente.findUnique({ where: { id: String(documento) } })
        if (existentePorDocumento) {
            return Response.json({ error: 'Ya existe un usuario con ese documento' }, { status: 409 })
        }

        const existente = await prisma.docente.findUnique({ where: { email } })
        if (existente) {
            return Response.json({ error: 'Ya existe un profesor con ese email' }, { status: 409 })
        }

        const hashContrasena = await bcrypt.hash(password, 10)
        const rolFinal = role === 'ADMIN' ? 'ADMIN' : 'TEACHER'

        const profesor = await prisma.docente.create({
            data: { id: String(documento), name, email, passwordHash: hashContrasena, role: rolFinal },
            select: { id: true, name: true, email: true, createdAt: true, role: true }
        })

        return Response.json(profesor, { status: 201 })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al crear profesor' }, { status: 500 })
    }
}
