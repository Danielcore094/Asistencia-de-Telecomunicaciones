export const dynamic = 'force-dynamic';

import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { consumirCupo } from '@/lib/limiteSolicitudes';
import { registrarAccion } from '@/lib/servicioAuditoria';

const SECRETO = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'secreto-solo-desarrollo-no-usar-produccion');

const obtenerIpCliente = (request) => {
    const ipReenviada = request.headers.get('x-forwarded-for');
    return ipReenviada?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'desconocida';
};

export async function POST(request) {
    try {
        if (!SECRETO) return Response.json({ error: 'Error de configuración del servidor' }, { status: 500 });

        const { desafio, codigo } = await request.json();
        if (typeof desafio !== 'string' || !/^\d{6}$/.test(String(codigo || ''))) {
            return Response.json({ error: 'El código de verificación debe tener 6 dígitos' }, { status: 400 });
        }

        let datosDesafio;
        try {
            datosDesafio = jwt.verify(desafio, SECRETO);
        } catch {
            return Response.json({ error: 'El código de verificación expiró. Inicia sesión nuevamente.' }, { status: 401 });
        }
        if (datosDesafio.purpose !== 'SECOND_FACTOR' || !datosDesafio.id) {
            return Response.json({ error: 'Desafío de autenticación inválido' }, { status: 401 });
        }

        const ip = obtenerIpCliente(request);
        const puedeIntentar = await consumirCupo(`segundo-factor:ip:${ip}:${datosDesafio.id}`);
        if (!puedeIntentar) return Response.json({ error: 'Demasiados intentos. Inicia sesión nuevamente más tarde.' }, { status: 429 });

        const codigoHash = createHash('sha256').update(String(codigo)).digest('hex');
        const actualizado = await prisma.docente.updateMany({
            where: {
                id: datosDesafio.id,
                twoFactorCodeHash: codigoHash,
                twoFactorCodeExpiry: { gt: new Date() },
                twoFactorCodeAttempts: { lt: 5 },
            },
            data: {
                twoFactorCodeHash: null,
                twoFactorCodeExpiry: null,
                twoFactorCodeAttempts: { increment: 1 },
            },
        });

        if (actualizado.count !== 1) {
            await prisma.docente.updateMany({
                where: {
                    id: datosDesafio.id,
                    twoFactorCodeExpiry: { gt: new Date() },
                    twoFactorCodeAttempts: { lt: 5 },
                },
                data: { twoFactorCodeAttempts: { increment: 1 } },
            });
            return Response.json({ error: 'Código de verificación incorrecto o expirado' }, { status: 401 });
        }

        const docente = await prisma.docente.findUnique({ where: { id: datosDesafio.id } });
        if (!docente) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

        const token = jwt.sign(
            { id: docente.id, email: docente.email, name: docente.name, role: docente.role },
            SECRETO,
            { expiresIn: process.env.JWT_EXPIRACION || '8h' }
        );

        await registrarAccion({
            usuario: { id: docente.id, name: docente.name, role: docente.role },
            accion: 'LOGIN',
            target: 'AUTH',
            ip,
        });

        return Response.json({
            token,
            teacher: { id: docente.id, email: docente.email, name: docente.name, role: docente.role },
            forcePasswordChange: typeof docente.resetToken === 'string' && docente.resetToken.startsWith('FORCE_CHANGE_PASSWORD:'),
            forcePasswordChangeToken: typeof docente.resetToken === 'string' && docente.resetToken.startsWith('FORCE_CHANGE_PASSWORD:') ? docente.resetToken : null,
        });
    } catch (error) {
        console.error('[2FA Error]', error);
        return Response.json({ error: 'Error del servidor' }, { status: 500 });
    }
}