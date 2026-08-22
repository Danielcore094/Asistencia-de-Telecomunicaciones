import { PrismaClient } from '@prisma/client'

const construirUrlBD = () => {
    const urlOriginal = (process.env.DATABASE_URL || '').replace('localhost', '127.0.0.1')
    if (!urlOriginal) return urlOriginal

    const limiteConexiones = Number(process.env.PRISMA_CONNECTION_LIMIT || '5')
    const connectionLimit = Number.isFinite(limiteConexiones) && limiteConexiones > 0 ? limiteConexiones : 5

    try {
        const url = new URL(urlOriginal)
        url.searchParams.set('connection_limit', String(connectionLimit))
        return url.toString()
    } catch (error) {
        return urlOriginal
    }
}

const urlBD = construirUrlBD()

const crearClientePrisma = () => {
    return new PrismaClient({
        datasources: {
            db: { url: urlBD }
        },
        errorFormat: 'pretty',
        log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'info', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' }
        ],
    })
}

const globalParaPrisma = globalThis
const prisma = globalParaPrisma.prismaGlobal ?? crearClientePrisma()
if (!globalParaPrisma.prismaGlobal) globalParaPrisma.prismaGlobal = prisma

export default prisma
