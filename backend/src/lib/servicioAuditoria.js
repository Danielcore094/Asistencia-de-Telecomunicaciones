import prisma from './prisma.js';

export async function registrarAccion({ usuario, accion, target, targetId, detalles, ip }) {
    try {
        if (!usuario) return;

        let detallesRegistro = detalles || {};
        if (target === 'COURSE' && targetId) {
            const curso = await prisma.curso.findUnique({
                where: { id: String(targetId) },
                select: { numero: true },
            });
            if (curso) {
                detallesRegistro = {
                    ...detallesRegistro,
                    identificadorEntidad: String(curso.numero).padStart(6, '0'),
                };
            }
        }

        await prisma.registroAuditoria.create({
            data: {
                userId: usuario.id,
                userName: usuario.name || 'Usuario',
                userRole: usuario.role,
                action: accion,
                target: target,
                targetId: targetId ? String(targetId) : null,
                details: detallesRegistro,
                ip: ip || null
            }
        });
    } catch (error) {
        console.error('[AuditLog] Error al registrar acción:', error);
    }
}
