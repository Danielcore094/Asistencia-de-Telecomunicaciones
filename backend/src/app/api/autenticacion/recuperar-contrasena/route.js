export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { enviarCorreo } from '@/lib/servicioCorreo';

const respuestaGenerica = {
    message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
};

export async function POST(request) {
    try {
        const cuerpo = await request.json();
        const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';

        if (!email) {
            return Response.json({ error: 'El correo es requerido' }, { status: 400 });
        }

        const teacher = await prisma.docente.findUnique({
            where: { email }
        });

        if (!teacher) {
            return Response.json(respuestaGenerica);
        }

        const token = crypto.randomBytes(32).toString('hex');
        
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.docente.update({
            where: { email },
            data: {
                resetToken: token,
                resetTokenExpiry: tokenExpiry,
            }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #6B2D8B;">Recuperación de Contraseña</h2>
                <p>Hola ${teacher.name},</p>
                <p>Hemos recibido una solicitud para restablecer tu contraseña en el Sistema de Asistencia de Telecomunicaciones.</p>
                <p>Haz clic en el siguiente enlace para crear una nueva contraseña. <strong>Este enlace expirará en 15 minutos.</strong></p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #8DC63F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                </div>
                <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad. Tu contraseña actual seguirá siendo válida.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #999;">UTS - Sistema de Asistencia de Telecomunicaciones</p>
            </div>
        `;

        const emailResult = await enviarCorreo({
            to: email,
            toName: teacher.name,
            subject: 'Restablecer contraseña - Asistencia Telecomunicaciones',
            htmlContent
        });

        if (!emailResult.success) {
            console.error('[forgot-password] No se pudo enviar el correo de recuperación:', emailResult.error);
        }

        return Response.json(respuestaGenerica);

    } catch (error) {
        console.error('[forgot-password]', error);
        return Response.json(respuestaGenerica);
    }
}
