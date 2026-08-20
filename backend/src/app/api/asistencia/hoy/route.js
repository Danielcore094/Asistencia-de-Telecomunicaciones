export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { obtenerUsuarioDePeticion } from '@/lib/autenticacion';
import { formatearFechaBogota } from '@/lib/utilidadesFechas';
import { headers } from 'next/headers';

export async function GET(request) {
    try {
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

        const sp = new URL(request.url).searchParams;
        const docenteId = usuario.role === 'ADMIN'
            ? (sp.get('docenteId') || null)
            : usuario.id;

        const hoy = formatearFechaBogota(new Date());

        const cursosWhere = docenteId ? { teacherId: docenteId } : {};
        const cursos = await prisma.curso.findMany({
            where: cursosWhere,
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });

        if (cursos.length === 0) {
            return Response.json({ cursos: [] });
        }

        const cursoIds = cursos.map(c => c.id);
        const registros = await prisma.asistencia.findMany({
            where: {
                courseId: { in: cursoIds },
                date: hoy,
            },
            select: { courseId: true, present: true, status: true },
        });

        const agrupado = {};
        registros.forEach(r => {
            if (!agrupado[r.courseId]) {
                agrupado[r.courseId] = { presentes: 0, total: 0 };
            }
            agrupado[r.courseId].total++;
            const estado = r.status || (r.present ? 'Presente' : 'Ausente');
            if (estado === 'Presente') agrupado[r.courseId].presentes++;
        });

        const resultado = cursos
            .filter(c => agrupado[c.id])
            .map(c => {
                const { presentes, total } = agrupado[c.id];
                const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;
                return { id: c.id, nombre: c.name, porcentaje, presentes, total };
            });

        return Response.json({ cursos: resultado });
    } catch (error) {
        console.error(error);
        return Response.json({ error: 'Error al obtener asistencia de hoy' }, { status: 500 });
    }
}