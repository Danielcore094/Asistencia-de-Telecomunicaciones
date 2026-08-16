import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function principal() {
    const hashContrasena = await bcrypt.hash('Admin2024!', 10);
    await prisma.teacher.update({
        where: { email: 'admin@uts.edu.co' },
        data: { passwordHash: hashContrasena, role: 'ADMIN' }
    });
    console.log('Contraseña del administrador actualizada a Admin2024!');
}
principal().finally(() => prisma.$disconnect());
