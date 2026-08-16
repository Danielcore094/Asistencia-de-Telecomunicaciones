import prisma from './prisma.js';

/**
 * Servicio para registrar acciones de usuarios en el sistema (Audit Log).
 * 
 * @param {Object} params
 * @param {Object} params.usuario - Objeto del usuario autenticado (id, name, role)
 * @param {string} params.accion  - Acción realizada (LOGIN, SAVE_ATTENDANCE, etc.)
 * @param {string} params.target  - Entidad afectada (ATTENDANCE, STUDENT, COURSE)
 * @param {string} [params.targetId] - ID de la entidad afectada
 * @param {Object} [params.detalles] - Detalles adicionales en JSON
 * @param {string} [params.ip]       - IP de la petición
 */
export async function registrarAccion({ usuario, accion, target, targetId, detalles, ip }) {
    try {
        if (!usuario) return; // No registrar si no hay usuario (peticiones anónimas fallidas)

        await prisma.registroAuditoria.create({
            data: {
                userId: usuario.id,
                userName: usuario.name || 'Usuario',
                userRole: usuario.role,
                action: accion,
                target: target,
                targetId: targetId ? String(targetId) : null,
                details: detalles || {},
                ip: ip || null
            }
        });
    } catch (error) {
        // No bloqueamos la ejecución principal si falla el log
        console.error('[AuditLog] Error al registrar acción:', error);
    }
}
