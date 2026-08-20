import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

const SECRETO = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'secreto-solo-desarrollo-no-usar-produccion')

export function obtenerUsuarioDePeticion(request) {
    if (!SECRETO) {
        console.error('[auth] JWT_SECRET no está configurado')
        return null
    }

    const encabezadoAuth = request.headers.get('authorization')
    if (!encabezadoAuth || !encabezadoAuth.startsWith('Bearer ')) return null
    try {
        const token = encabezadoAuth.split(' ')[1]
        return jwt.verify(token, SECRETO)
    } catch (e) {
        return null
    }
}

export async function verificarAccesoCurso(idCurso, usuario) {
    const curso = await prisma.curso.findUnique({ where: { id: idCurso } })

    if (!curso) {
        return { permitido: false, curso: null, error: 'Materia no encontrada', status: 404 }
    }

    if (usuario.role === 'ADMIN') {
        return { permitido: true, curso, error: null, status: 200 }
    }

    if (curso.teacherId !== usuario.id) {
        return { permitido: false, curso: null, error: 'No tenés acceso a esta materia', status: 403 }
    }

    return { permitido: true, curso, error: null, status: 200 }
}
