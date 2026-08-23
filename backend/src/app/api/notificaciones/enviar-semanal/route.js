export const dynamic = 'force-dynamic';

import { obtenerUsuarioDePeticion } from '@/lib/autenticacion';
import { ejecutarNotificacionSemanalInasistencias } from '@/jobs/notificacionSemanalInasistencias';
import prisma from '@/lib/prisma';

export async function POST(request) {
    const usuario = obtenerUsuarioDePeticion(request);
    if (!usuario) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (usuario.role !== 'ADMIN') {
        return Response.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    console.log(`[send-weekly] Ejecución manual por: ${usuario.email} a las ${new Date().toISOString()}`);

    try {
        const resultados = await ejecutarNotificacionSemanalInasistencias({ usuario, origen: 'MANUAL' });
        return Response.json({
            success: true,
            message: 'Proceso de notificación completado',
            results: {
                sent: resultados.sent,
                skipped: resultados.skipped,
                errors: resultados.errors,
                details: resultados.details,
            },
        });
    } catch (error) {
        console.error('[send-weekly] Error:', error.message);
        return Response.json(
            { error: 'Error al ejecutar el proceso de notificación', detail: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    const usuario = obtenerUsuarioDePeticion(request);
    if (!usuario) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (usuario.role !== 'ADMIN') {
        return Response.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const ultimoLog = await prisma.registroNotificacion.findFirst({
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true, weekStart: true, status: true },
    });

    const { weekStart } = obtenerSemanaActual();
    const totalEstaSemana = await prisma.registroNotificacion.count({
        where: { weekStart, status: 'SUCCESS' },
    });

    const historial = await prisma.registroNotificacion.findMany({
        take: 100,
        orderBy: { sentAt: 'desc' },
        include: { student: { select: { documento: true, name: true } } },
    });

    return Response.json({
        servicio: 'notificador-semanal-inasistencias',
        estado: 'activo',
        programacion: '0 18 * * 0',
        descripcion: 'Envía correos a estudiantes con inasistencias de la semana (lunes-sábado)',
        zonaHoraria: 'America/Bogota',
        ultimaEjecucion: ultimoLog
            ? {
                fecha: ultimoLog.sentAt,
                semana: ultimoLog.weekStart,
                estado: ultimoLog.status,
            }
            : null,
        estadoSemanaActual: {
            weekStart,
            correosEnviados: totalEstaSemana,
        },
        historial: historial.map((registro) => ({
            id: registro.id,
            estudiante: registro.student.name,
            documento: registro.student.documento,
            correo: registro.email,
            semana: registro.weekStart,
            fecha: registro.sentAt,
            estado: registro.status,
            error: registro.error,
        })),
    });
}

function obtenerSemanaActual() {
    const formatearFechaBogota = (d) => new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);

    const hoy = formatearFechaBogota(new Date());
    const [y, m, d] = hoy.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const diaSemana = fecha.getDay();
    const diasAlLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() + diasAlLunes);
    return { weekStart: formatearFechaBogota(lunes) };
}

