import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`
        return Response.json({ estado: 'disponible' })
    } catch (error) {
        console.error('[health] Base de datos no disponible', error)
        return Response.json({ estado: 'no disponible' }, { status: 503 })
    }
}