import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function principal() {
    const docentes = await prisma.teacher.findMany();
    console.log(JSON.stringify(docentes, null, 2));
}
principal().finally(() => prisma.$disconnect());
