export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return Response.json({ error: 'Token y nueva contraseña son requeridos' }, { status: 400 });
        }

        // Buscar al usuario que tenga este token
        const teacher = await prisma.docente.findFirst({
            where: {
                resetToken: token,
            }
        });

        if (!teacher) {
            return Response.json({ error: 'El enlace de recuperación es inválido' }, { status: 400 });
        }

        // Verificar si expiró
        if (teacher.resetTokenExpiry && new Date() > teacher.resetTokenExpiry) {
            return Response.json({ error: 'El enlace de recuperación ha expirado. Solicita uno nuevo.' }, { status: 400 });
        }

        // Hashear la nueva contraseña
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Actualizar el profesor
        await prisma.docente.update({
            where: { id: teacher.id },
            data: {
                passwordHash,
                // Limpiar el token para que no se pueda volver a usar
                resetToken: null,
                resetTokenExpiry: null,
            }
        });

        return Response.json({ message: 'Contraseña actualizada con éxito' });

    } catch (error) {
        console.error('[reset-password]', error);
        return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
