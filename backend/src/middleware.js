import { NextResponse } from 'next/server'

const origenesLocalesDesarrollo = ['http://localhost:3000']

const obtenerOrigenesPermitidos = () => {
    const origenesConfigurados = (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origen) => origen.trim())
        .filter(Boolean)

    if (origenesConfigurados.length > 0) return new Set(origenesConfigurados)
    return process.env.NODE_ENV === 'production' ? new Set() : new Set(origenesLocalesDesarrollo)
}

const aplicarEncabezadosCors = (response, origin) => {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version')
    response.headers.set('Vary', 'Origin')
    return response
}

export function middleware(request) {
    const origin = request.headers.get('origin')
    const esOrigenPermitido = !origin || obtenerOrigenesPermitidos().has(origin)

    if (!esOrigenPermitido) {
        return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
    }

    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, {
            status: 204,
        })
        response.headers.set('Access-Control-Max-Age', '86400')
        return origin ? aplicarEncabezadosCors(response, origin) : response
    }

    const response = NextResponse.next()
    return origin ? aplicarEncabezadosCors(response, origin) : response
}

export const config = {
    matcher: '/api/:path*',
}
