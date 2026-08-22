import { PrismaClient } from '@prisma/client'

const construirUrlBD = () => {
    const urlOriginal = (process.env.DATABASE_URL || '').replace('localhost', '127.0.0.1')
    if (!urlOriginal) return urlOriginal

    try {
        const url = new URL(urlOriginal)

        if (!url.searchParams.has('connection_limit')) {
            url.searchParams.set('connection_limit', '15')
        }

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
