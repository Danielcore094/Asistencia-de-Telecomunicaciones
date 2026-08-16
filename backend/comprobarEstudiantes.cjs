const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function principal() {
  const curso = await prisma.course.findFirst({ include: { students: true } });
  console.log("Curso:", curso.name, curso.groupCode, curso.code);
  console.log("Estudiantes en el curso:", curso.students.length);
  
  const todosLosCursos = await prisma.course.findMany({ include: { students: true } });
  for (const cursoListado of todosLosCursos) {
    if (cursoListado.students.length > 0) {
      console.log(`El curso ${cursoListado.name} tiene ${cursoListado.students.length} estudiantes`);
    }
  }
}

principal().finally(() => prisma.$disconnect());
