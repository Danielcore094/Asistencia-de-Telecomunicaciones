import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function principal() {
    const registros = await prisma.whatsappNotificationLog.findMany({
        take: 10,
        orderBy: { sentAt: 'desc' }
    });
    console.log(JSON.stringify(registros, null, 2));
    await prisma.$disconnect();
}
principal();
