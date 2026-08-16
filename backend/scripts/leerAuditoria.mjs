import prisma from '../src/lib/prisma.js';

(async () => {
  try {
    const registros = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify(registros, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error al leer los registros de auditoría:', error);
    process.exit(1);
  }
})();
