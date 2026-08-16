const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function probar() {
    try {
        // Primero buscar un teacher
        const teacher = await prisma.teacher.findFirst();
        if (!teacher) {
            console.error('❌ No hay profesores en la BD. Ejecuta seed.js primero.');
            return;
        }
        console.log('✅ Profe encontrado:', teacher.email);

        // Intentar crear un curso
        const curso = await prisma.course.create({
            data: {
                name: 'Prueba de Telecomunicaciones',
                code: 'TEST-001',
                teacherId: teacher.id
            }
        });
        console.log('✅ Curso creado exitosamente:');
        console.log('   ID:', curso.id, '(tipo:', typeof curso.id, ')');
        console.log('   Nombre:', curso.name);
        console.log('   Código:', curso.code);

        // Limpiar
        await prisma.course.delete({ where: { id: curso.id } });
        console.log('✅ Curso de prueba eliminado.');
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Código de error Prisma:', err.code);
        if (err.meta) console.error('Meta:', JSON.stringify(err.meta));
    } finally {
        await prisma.$disconnect();
    }
}

probar();
