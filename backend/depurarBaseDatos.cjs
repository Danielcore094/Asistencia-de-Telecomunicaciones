const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function principal() {
  const docentes = await prisma.teacher.findMany();
  console.log('--- DOCENTES EN LA BASE DE DATOS ---');
  console.log(JSON.stringify(docentes, null, 2));
  
  const cursos = await prisma.course.findMany({
    select: {
        id: true,
        name: true,
        teacherId: true
    }
  });
  console.log('--- CURSOS EN LA BASE DE DATOS ---');
  console.log(JSON.stringify(cursos, null, 2));
}

principal()
  .catch(error => console.error(error))
  .finally(async () => await prisma.$disconnect());
