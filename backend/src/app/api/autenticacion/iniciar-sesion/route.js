export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomInt, createHash } from 'node:crypto'
import { consumirCupo, limpiarIntentos } from '@/lib/limiteSolicitudes'
import { enviarCorreo, construirCorreoSegundoFactorHTML } from '@/lib/servicioCorreo'

const SECRETO = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'secreto-solo-desarrollo-no-usar-produccion')

const obtenerIpCliente = (request) => {
    const ipReenviada = request.headers.get('x-forwarded-for')
    return ipReenviada?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'desconocida'
}

const verificarCaptcha = async (token, ip) => {
    const secretoCaptcha = process.env.TURNSTILE_SECRET_KEY
    if (!secretoCaptcha) {
        throw new Error('TURNSTILE_SECRET_KEY no está configurado')
    }

    const respuesta = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretoCaptcha, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
    })

    if (!respuesta.ok) return false
    const resultado = await respuesta.json()
    return resultado.success === true
}

export async function POST(request) {
    try {
        console.log('[Login] Intento de inicio de sesión recibido')
        const cuerpo = await request.json()
        const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : ''
        const password = typeof cuerpo.password === 'string' ? cuerpo.password : ''
        const captchaToken = typeof cuerpo.captchaToken === 'string' ? cuerpo.captchaToken : ''

        if (!email || !password || email.length > 254 || password.length > 128) {
            return Response.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        if (!SECRETO) {
            console.error('[Login] JWT_SECRET no está configurado')
            return Response.json({ error: 'Error de configuración del servidor' }, { status: 500 })
        }

        const ip = obtenerIpCliente(request)
        if (!captchaToken) {
            return Response.json({ error: 'Completa la verificación CAPTCHA' }, { status: 400 })
        }

        if (!(await verificarCaptcha(captchaToken, ip))) {
            return Response.json({ error: 'La verificación CAPTCHA no es válida' }, { status: 400 })
        }

        const claveIp = `inicio-sesion:ip:${ip}`
        const claveCuenta = `inicio-sesion:cuenta:${ip}:${email}`
        const [puedeIntentarIp, puedeIntentarCuenta] = await Promise.all([
            consumirCupo(claveIp),
            consumirCupo(claveCuenta),
        ])
        if (!puedeIntentarIp || !puedeIntentarCuenta) {
            return Response.json({ error: 'Demasiados intentos. Intenta nuevamente más tarde' }, { status: 429 })
        }

        const docente = await prisma.docente.findUnique({ where: { email } })
        if (!docente) {
            console.log(`[Login] Usuario no encontrado: ${email}`)
            return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
        }

        const esValida = await bcrypt.compare(password, docente.passwordHash)
        if (!esValida) {
            console.log(`[Login] Contraseña incorrecta para: ${email}`)
            return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
        }

        await Promise.all([limpiarIntentos(claveIp), limpiarIntentos(claveCuenta)])

        const codigo = String(randomInt(100000, 1000000))
        const codigoHash = createHash('sha256').update(codigo).digest('hex')
        const codigoExpira = new Date(Date.now() + 10 * 60 * 1000)
        await prisma.docente.update({
            where: { id: docente.id },
            data: {
                twoFactorCodeHash: codigoHash,
                twoFactorCodeExpiry: codigoExpira,
                twoFactorCodeAttempts: 0,
            },
        })

        const correoCodigo = await enviarCorreo({
            to: docente.email,
            toName: docente.name,
            subject: 'Código de verificación - Asistencia Telecomunicaciones',
            htmlContent: construirCorreoSegundoFactorHTML({ userName: docente.name, code: codigo }),
        })
        if (!correoCodigo.success) {
            await prisma.docente.update({
                where: { id: docente.id },
                data: { twoFactorCodeHash: null, twoFactorCodeExpiry: null, twoFactorCodeAttempts: 0 },
            })
            return Response.json({ error: 'No fue posible enviar el código de verificación. Intenta nuevamente.' }, { status: 503 })
        }

        const desafio = jwt.sign(
            { id: docente.id, email: docente.email, purpose: 'SECOND_FACTOR' },
            SECRETO,
            { expiresIn: '10m' }
        )

        const forcePasswordChange = typeof docente.resetToken === 'string' && docente.resetToken.startsWith('FORCE_CHANGE_PASSWORD:')

        return Response.json({ 
            requiereSegundoFactor: true,
            desafio,
            teacher: { id: docente.id, email: docente.email, name: docente.name, role: docente.role },
            forcePasswordChange,
            forcePasswordChangeToken: forcePasswordChange ? docente.resetToken : null,
        })
    } catch (error) {
        console.error('[Login Error]', error)
        return Response.json({ error: 'Error del servidor' }, { status: 500 })
    }
}
