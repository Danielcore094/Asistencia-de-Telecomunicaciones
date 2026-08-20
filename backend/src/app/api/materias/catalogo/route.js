export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion';
import { registrarAccion } from '@/lib/servicioAuditoria';

const obtenerDatosMateria = (datos) => {
    const codigo = String(datos.codigo || '').trim().toUpperCase();
    const nombre = String(datos.nombre || '').trim();
    const programa = String(datos.programa || '').trim();
    const semestre = datos.semestre === '' || datos.semestre == null
        ? null
        : Number(datos.semestre);

    if (!codigo || !nombre || !programa) {
        return { error: 'Código, nombre y programa son requeridos' };
    }

    if (semestre !== null && (!Number.isInteger(semestre) || semestre < 1 || semestre > 10)) {
        return { error: 'El semestre debe ser un número entero entre 1 y 10' };
    }

    return { datos: { codigo, nombre, programa, semestre } };
};

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

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

export async function POST(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 });
        }

        const resultado = obtenerDatosMateria(await request.json());
        if (resultado.error) {
            return Response.json({ error: resultado.error }, { status: 400 });
        }

        const materia = await prisma.materiaCatalogo.create({ data: resultado.datos });

        await registrarAccion({
            usuario,
            accion: 'CREAR_MATERIA_CATALOGO',
            target: 'MATERIA_CATALOGO',
            targetId: materia.id,
            detalles: resultado.datos,
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        return Response.json(materia, { status: 201 });
    } catch (error) {
        if (error.code === 'P2002') {
            return Response.json({ error: 'Ya existe una materia con ese código en el programa seleccionado' }, { status: 409 });
        }
        console.error('Error creando materia del catálogo:', error);
        return Response.json({ error: 'Error al crear la materia del catálogo' }, { status: 500 });
    }
}
