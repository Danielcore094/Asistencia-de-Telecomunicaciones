export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SECRETO = process.env.JWT_SECRET || 'telecom_secret_key_2024'

// POST /api/auth/login — autenticación de docentes
export async function POST(request) {
    try {
        console.log('[Login] Intento de inicio de sesión recibido')
        const { email, password } = await request.json()

        if (!email || !password) {
            return Response.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        // Buscar docente por email
        const docente = await prisma.docente.findUnique({ where: { email } })
        if (!docente) {
            console.log(`[Login] Usuario no encontrado: ${email}`)
            return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
        }

        // Verificar contraseña
        const esValida = await bcrypt.compare(password, docente.passwordHash)
        if (!esValida) {
            console.log(`[Login] Contraseña incorrecta para: ${email}`)
            return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: docente.id, email: docente.email, name: docente.name, role: docente.role },
            SECRETO,
            { expiresIn: '7d' }
        )

        console.log(`[Login] Sesión iniciada: ${email} (${docente.role})`)
        
        // Registro de auditoría
        const { registrarAccion } = await import('@/lib/auditService');
        registrarAccion({
            usuario: { id: docente.id, name: docente.name, role: docente.role },
            accion: 'LOGIN',
            target: 'AUTH',
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        });

        return Response.json({ 
            token, 
            teacher: { id: docente.id, email: docente.email, name: docente.name, role: docente.role } 
        })
    } catch (error) {
        console.error('[Login Error]', error)
        return Response.json({ error: 'Error del servidor' }, { status: 500 })
    }
}
