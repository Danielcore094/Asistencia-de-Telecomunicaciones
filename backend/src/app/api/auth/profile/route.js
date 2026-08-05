export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const SECRETO = process.env.JWT_SECRET || 'telecom_secret_key_2024';

export async function PUT(request) {
    try {
        const encabezadoAuth = request.headers.get('authorization');
        if (!encabezadoAuth || !encabezadoAuth.startsWith('Bearer ')) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

        const token = encabezadoAuth.split(' ')[1];
        const decodificado = jwt.verify(token, SECRETO);
        const userId = decodificado.id;

        const body = await request.json();
        const { name, currentPassword, newPassword } = body;

        // Fetch user from DB
        const teacher = await prisma.docente.findUnique({
            where: { id: userId },
        });

        if (!teacher) {
            return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const updateData = {};

        // Update name if provided
        if (name && name.trim() !== '') {
            updateData.name = name;
        }

        // Update password if requested
        if (newPassword && newPassword.trim() !== '') {
            if (!currentPassword) {
                return Response.json({ error: 'Se requiere la contraseña actual para cambiarla' }, { status: 400 });
            }

            const passwordValida = await bcrypt.compare(currentPassword, teacher.passwordHash);
            if (!passwordValida) {
                return Response.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 });
            }

            const salt = await bcrypt.genSalt(10);
            updateData.passwordHash = await bcrypt.hash(newPassword, salt);
        }

        // Apply changes
        if (Object.keys(updateData).length > 0) {
            await prisma.docente.update({
                where: { id: userId },
                data: updateData,
            });
        }

        // It is recommended to return a new token if the payload fields change (like name) 
        // but for simplicity, the client can just rely on state update for now or re-fetch /me
        return Response.json({ success: true, message: 'Perfil actualizado correctamente' });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
             return Response.json({ error: 'Token inválido o expirado' }, { status: 401 });
        }
        return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
