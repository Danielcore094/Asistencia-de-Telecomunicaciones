const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function principal() {
  const estudiantes = await prisma.student.count();
  const cursos = await prisma.course.count();
  const asistencias = await prisma.attendance.count();
  console.log({ estudiantes, cursos, asistencias });
}

principal().finally(() => prisma.$disconnect());
