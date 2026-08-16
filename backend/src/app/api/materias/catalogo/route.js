export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion';

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Raw query para incluir el campo programa sin depender del cliente generado
        const catalogo = await prisma.$queryRaw`
            SELECT id, codigo, nombre, programa, semestre
            FROM materias_catalogo
            ORDER BY programa ASC, semestre ASC NULLS LAST, nombre ASC
        `;

        return Response.json(catalogo);
    } catch (error) {
        console.error('Error obteniendo catálogo:', error);
        return Response.json({ error: 'Error al obtener el catálogo de materias' }, { status: 500 });
    }
}
