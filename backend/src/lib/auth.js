import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

// Clave secreta para firmar y verificar tokens JWT
const SECRETO = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'secreto-solo-desarrollo-no-usar-produccion')

/**
 * Extrae y verifica el usuario desde el encabezado Authorization de la petición.
 * Retorna los datos del token o null si es inválido / ausente.
 */
export function obtenerUsuarioDePeticion(request) {
    if (!SECRETO) {
        console.error('[auth] JWT_SECRET no está configurado')
        return null
    }

    const encabezadoAuth = request.headers.get('authorization')
    if (!encabezadoAuth || !encabezadoAuth.startsWith('Bearer ')) return null
    try {
        const token = encabezadoAuth.split(' ')[1]
        return jwt.verify(token, SECRETO) // { id, email, name, role } — id es el teacherId
    } catch (e) {
        return null
    }
}

/**
 * Verifica que el docente autenticado tenga acceso al courseId solicitado.
 * Los ADMIN pasan siempre. Los TEACHER solo si el curso les pertenece.
 *
 * @param {string} idCurso - ID del curso a verificar
 * @param {object} usuario - Payload del JWT ({ id, role, ... })
 * @returns {{ permitido: boolean, curso: object|null, error: string|null, status: number }}
 */
export async function verificarAccesoCurso(idCurso, usuario) {
    const curso = await prisma.curso.findUnique({ where: { id: idCurso } })

    if (!curso) {
        return { permitido: false, curso: null, error: 'Materia no encontrada', status: 404 }
    }

    // ADMIN tiene acceso a todo
    if (usuario.role === 'ADMIN') {
        return { permitido: true, curso, error: null, status: 200 }
    }

    // TEACHER solo accede a sus propias materias
    if (curso.teacherId !== usuario.id) {
        return { permitido: false, curso: null, error: 'No tenés acceso a esta materia', status: 403 }
    }

    return { permitido: true, curso, error: null, status: 200 }
}
