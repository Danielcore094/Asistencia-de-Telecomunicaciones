export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const SECRETO = process.env.JWT_SECRET || 'telecom_secret_key_2024'

// GET /api/auth/me — devuelve los datos del docente autenticado
export async function GET(request) {
    try {
        const encabezadoAuth = request.headers.get('authorization')
        if (!encabezadoAuth || !encabezadoAuth.startsWith('Bearer ')) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const token = encabezadoAuth.split(' ')[1]
        const decodificado = jwt.verify(token, SECRETO)

        return Response.json({ id: decodificado.id, email: decodificado.email, name: decodificado.name, role: decodificado.role })
    } catch (error) {
        return Response.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }
}
