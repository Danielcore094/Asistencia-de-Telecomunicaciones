import prisma from '../src/lib/prisma.js';

(async () => {
  try {
    // ID tomado de los registros recientes (ajusta si hace falta)
    const id = 'cmqs9cmko0013tbumg1if9qou';
    const existente = await prisma.auditLog.findUnique({ where: { id } });
    if (!existente) {
      console.error('Registro no encontrado', id);
      process.exit(1);
    }

    const detalles = existente.details || {};
    detalles.courseName = detalles.courseName || 'Materia de Prueba';

    await prisma.auditLog.update({ where: { id }, data: { details: detalles } });
    const actualizado = await prisma.auditLog.findUnique({ where: { id } });
    console.log('Actualizado:', JSON.stringify(actualizado, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error al actualizar el registro de auditoría:', error);
    process.exit(1);
  }
})();
