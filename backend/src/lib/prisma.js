import { PrismaClient } from '@prisma/client'

const urlBD = (process.env.DATABASE_URL || '').replace('localhost', '127.0.0.1')

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

if (process.env.NODE_ENV !== 'production') globalParaPrisma.prismaGlobal = prisma

export default prisma
