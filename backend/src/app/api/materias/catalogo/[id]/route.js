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

export async function PUT(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 });
        }

        const materiaExistente = await prisma.materiaCatalogo.findUnique({
            where: { id: params.id },
        });
        if (!materiaExistente) {
            return Response.json({ error: 'Materia del catálogo no encontrada' }, { status: 404 });
        }

        const resultado = obtenerDatosMateria(await request.json());
        if (resultado.error) {
            return Response.json({ error: resultado.error }, { status: 400 });
        }

        const cambiaIdentidad = materiaExistente.codigo !== resultado.datos.codigo
            || materiaExistente.programa !== resultado.datos.programa;
        if (cambiaIdentidad) {
            const cursosRelacionados = await prisma.curso.count({
                where: {
                    code: materiaExistente.codigo,
                    programa: materiaExistente.programa,
                },
            });
            if (cursosRelacionados > 0) {
                return Response.json({
                    error: 'No se puede cambiar el código o programa porque la materia ya tiene asignaciones. Puedes editar su nombre y semestre.',
                }, { status: 409 });
            }
        }

        const materia = await prisma.materiaCatalogo.update({
            where: { id: params.id },
            data: resultado.datos,
        });

        await registrarAccion({
            usuario,
            accion: 'EDITAR_MATERIA_CATALOGO',
            target: 'MATERIA_CATALOGO',
            targetId: materia.id,
            detalles: { anterior: materiaExistente, nuevo: resultado.datos },
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        return Response.json(materia);
    } catch (error) {
        if (error.code === 'P2002') {
            return Response.json({ error: 'Ya existe una materia con ese código en el programa seleccionado' }, { status: 409 });
        }
        console.error('Error actualizando materia del catálogo:', error);
        return Response.json({ error: 'Error al actualizar la materia del catálogo' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario || usuario.role !== 'ADMIN') {
            return Response.json({ error: 'No autorizado' }, { status: 403 });
        }

        const materia = await prisma.materiaCatalogo.findUnique({
            where: { id: params.id },
        });
        if (!materia) {
            return Response.json({ error: 'Materia del catálogo no encontrada' }, { status: 404 });
        }

        const cursosRelacionados = await prisma.curso.count({
            where: {
                code: materia.codigo,
                programa: materia.programa,
            },
        });
        if (cursosRelacionados > 0) {
            return Response.json({
                error: `No se puede eliminar porque está utilizada en ${cursosRelacionados} asignación${cursosRelacionados === 1 ? '' : 'es'}`,
            }, { status: 409 });
        }

        await prisma.materiaCatalogo.delete({ where: { id: params.id } });

        await registrarAccion({
            usuario,
            accion: 'ELIMINAR_MATERIA_CATALOGO',
            target: 'MATERIA_CATALOGO',
            targetId: materia.id,
            detalles: materia,
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error eliminando materia del catálogo:', error);
        return Response.json({ error: 'Error al eliminar la materia del catálogo' }, { status: 500 });
    }
}