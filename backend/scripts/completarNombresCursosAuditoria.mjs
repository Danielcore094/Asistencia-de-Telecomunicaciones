import prisma from '../src/lib/prisma.js';

(async () => {
  try {
    const registros = await prisma.auditLog.findMany({
      where: { action: 'EXPORTAR_REPORTE' },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    let actualizados = 0;
    for (const registro of registros) {
      const detalles = registro.details || {};
      if (detalles.courseName) continue;
      const idCurso = detalles.courseId;
      if (!idCurso) continue;

      const curso = await prisma.course.findUnique({ where: { id: idCurso } });
      if (!curso) continue;

      detalles.courseName = curso.name;

      await prisma.auditLog.update({
        where: { id: registro.id },
        data: { details: detalles }
      });
      actualizados++;
      console.log(`Registro ${registro.id} actualizado con la materia '${curso.name}'`);
    }

    console.log(`Proceso terminado. Se actualizaron ${actualizados} registros.`);
    process.exit(0);
  } catch (error) {
    console.error('Error al actualizar los registros de auditoría:', error);
    process.exit(1);
  }
})();
