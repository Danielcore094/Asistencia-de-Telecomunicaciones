export const dynamic = 'force-dynamic';

import { obtenerUsuarioDePeticion } from '@/lib/autenticacion'

export async function GET(request) {
    const usuario = obtenerUsuarioDePeticion(request)
    if (!usuario) {
        return Response.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    return Response.json({ id: usuario.id, email: usuario.email, name: usuario.name, role: usuario.role })
}
