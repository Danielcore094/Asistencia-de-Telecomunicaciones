import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const { default: prisma } = await import('./src/lib/prisma.js');

const rows = await prisma.attendance.findMany({
    take: 10,
    orderBy: { date: 'desc' },
    select: { date: true, present: true, status: true }
});
console.log('Últimas 10 fechas de asistencia en DB:');
const unique = [...new Set(rows.map(r => r.date))];
console.log(unique);

const teachers = await prisma.teacher.findMany({ select: { id: true, name: true }, take: 5 });
console.log('\nDocentes:', teachers.map(t => t.name));

const courses = await prisma.course.findMany({
    select: { id: true, name: true, teacherId: true, groupCode: true },
    take: 5
});
console.log('\nPrimeros 5 cursos:', courses.map(c => c.name + ' ' + c.groupCode));

await prisma.$disconnect();
process.exit(0);
