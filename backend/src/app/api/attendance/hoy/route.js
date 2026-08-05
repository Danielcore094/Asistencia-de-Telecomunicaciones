export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { obtenerUsuarioDePeticion } from '@/lib/auth';
import { fmtBogota } from '@/lib/dateUtils';
// Importamos 'headers' para forzar a Next.js a tratar la ruta como dinámica en el build de forma interna
import { headers } from 'next/headers';

// GET /api/attendance/hoy
// Devuelve el % de asistencia del día de hoy por materia.
// Params opcionales: docenteId (para filtrar solo sus materias)
// Response: { cursos: [{ id, nombre, porcentaje, presentes, total }] }
export async function GET(request) {
    try {
        // Al llamar a headers(), Next.js aborta de inmediato cualquier intento de pre-renderizar estáticamente esta ruta
        // Verificar autenticación
        const usuario = obtenerUsuarioDePeticion(request);
        if (!usuario) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

        const sp = new URL(request.url).searchParams;
        // TEACHER: solo ve sus propias materias. ADMIN: puede filtrar por docenteId o ver todo.
        const docenteId = usuario.role === 'ADMIN'
            ? (sp.get('docenteId') || null)
            : usuario.id;

        const hoy = fmtBogota(new Date());

        // 1. Obtener todos los cursos (opcionalmente filtrados por docente)
        const cursosWhere = docenteId ? { teacherId: docenteId } : {};
        const cursos = await prisma.curso.findMany({
            where: cursosWhere,
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });

        if (cursos.length === 0) {
            return Response.json({ cursos: [] });
        }

        // 2. Obtener registros de asistencia de hoy para todos esos cursos
        const cursoIds = cursos.map(c => c.id);
        const registros = await prisma.asistencia.findMany({
            where: {
                courseId: { in: cursoIds },
                date: hoy,
            },
            select: { courseId: true, present: true, status: true },
        });

        // 3. Agrupar por curso y calcular porcentaje
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
            .filter(c => agrupado[c.id]) // solo los que tienen registro hoy
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