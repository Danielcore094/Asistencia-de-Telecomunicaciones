const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function main() {
  const course = await prisma.course.findFirst({ where: { students: { some: {} } }});
  console.log("Using course:", course.id, course.name);
  
  http.get(`http://localhost:5000/api/reportes?courseId=${course.id}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Reports API response:', data.substring(0, 500)));
  }).on('error', err => console.log('API Error:', err.message));
  
  http.get(`http://localhost:5000/api/estudiantes?courseId=${course.id}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Students API response:', data.substring(0, 500)));
  }).on('error', err => console.log('API Error:', err.message));
}

main().finally(() => prisma.$disconnect());
