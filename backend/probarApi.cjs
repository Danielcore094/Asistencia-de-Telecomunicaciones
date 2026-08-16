const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function principal() {
  const curso = await prisma.course.findFirst({ where: { students: { some: {} } }});
  console.log("Curso utilizado:", curso.id, curso.name);
  
  http.get(`http://localhost:5000/api/reportes?courseId=${curso.id}`, (respuesta) => {
    let datos = '';
    respuesta.on('data', fragmento => datos += fragmento);
    respuesta.on('end', () => console.log('Respuesta de la API de reportes:', datos.substring(0, 500)));
  }).on('error', error => console.log('Error de la API:', error.message));
  
  http.get(`http://localhost:5000/api/estudiantes?courseId=${curso.id}`, (respuesta) => {
    let datos = '';
    respuesta.on('data', fragmento => datos += fragmento);
    respuesta.on('end', () => console.log('Respuesta de la API de estudiantes:', datos.substring(0, 500)));
  }).on('error', error => console.log('Error de la API:', error.message));
}

principal().finally(() => prisma.$disconnect());
