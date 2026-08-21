export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'
import { obtenerErrorContrasena } from '@/lib/politicaContrasena'
import { enviarCorreo, construirCorreoBienvenidaHTML } from '@/lib/servicioCorreo'

const FORCE_CHANGE_PREFIX = 'FORCE_CHANGE_PASSWORD:'

const generarContrasenaTemporal = () => {
    return crypto.randomBytes(9).toString('base64url');
}

const generarTokenCambioForzado = () => {
    return `${FORCE_CHANGE_PREFIX}${crypto.randomBytes(16).toString('hex')}`
}

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

export async function POST(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request)
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { documento, name, email, password, role } = await request.json()

        if (!documento || !name || !email) {
            return Response.json({ error: 'Documento, nombre y email son requeridos' }, { status: 400 })
        }

        if (!/^\d{6,10}$/.test(String(documento))) {
            return Response.json({ error: 'El documento debe tener entre 6 y 10 numeros' }, { status: 400 })
        }

        const passwordFinal = password && password.trim() !== '' ? password.trim() : generarContrasenaTemporal()

        if (password && password.trim() !== '') {
            const errorContrasena = obtenerErrorContrasena(passwordFinal)
            if (errorContrasena) {
                return Response.json({ error: errorContrasena }, { status: 400 })
            }
        }

        const existentePorDocumento = await prisma.docente.findUnique({ where: { id: String(documento) } })
        if (existentePorDocumento) {
            return Response.json({ error: 'Ya existe un usuario con ese documento' }, { status: 409 })
        }

        const existente = await prisma.docente.findUnique({ where: { email } })
        if (existente) {
            return Response.json({ error: 'Ya existe un profesor con ese email' }, { status: 409 })
        }

        const rolFinal = role === 'ADMIN' ? 'ADMIN' : 'TEACHER'
        const hashContrasena = await bcrypt.hash(passwordFinal, 10)

        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const htmlContent = construirCorreoBienvenidaHTML({
            userName: name,
            email,
            password: passwordFinal,
            loginUrl,
        })

        const emailResultado = await enviarCorreo({
            to: email,
            toName: name,
            subject: 'Bienvenido al Sistema de Asistencia',
            htmlContent,
        })

        if (!emailResultado.success && (!password || password.trim() === '')) {
            return Response.json({
                error: 'No se pudo enviar el correo con las credenciales. Ingresa una contraseña manual y vuelve a intentarlo.',
                emailError: true,
            }, { status: 502 })
        }

        const profesor = await prisma.docente.create({
            data: {
                id: String(documento),
                name,
                email,
                passwordHash: hashContrasena,
                role: rolFinal,
                resetToken: generarTokenCambioForzado(),
                resetTokenExpiry: null,
            },
            select: { id: true, name: true, email: true, createdAt: true, role: true },
        })

        const responsePayload = {
            ...profesor,
            emailSent: emailResultado.success,
        }

        if (!emailResultado.success) {
            responsePayload.warning = 'No se pudo enviar el correo de bienvenida. El usuario se creó con la contraseña manual proporcionada.'
        }

        return Response.json(responsePayload, { status: 201 })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Error al crear profesor' }, { status: 500 })
    }
}
