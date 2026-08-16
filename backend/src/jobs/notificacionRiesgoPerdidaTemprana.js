import prisma from '../lib/prisma.js';
import {
    construirCorreoRiesgoPerdidaHTML,
    enviarCorreo,
} from '../lib/servicioCorreo.js';
import { esDurantePrimerasDosSemanas, evaluarRiesgoPerdidaTemprana } from '../lib/riesgoAsistencia.js';

const ACCION_ALERTA_RIESGO = 'ALERTA_POSIBLE_PERDIDA';

export async function ejecutarNotificacionRiesgoPerdidaTemprana({ idCurso, idsEstudiantes, fecha }) {
    const curso = await prisma.curso.findUnique({
        where: { id: idCurso },
        select: {
            id: true,
            name: true,
            dia: true,
            horaInicio: true,
            horaFin: true,
            dia2: true,
            horaInicio2: true,
            horaFin2: true,
        },
    });

    if (!curso) return;

    const primerRegistro = await prisma.asistencia.findFirst({
        where: { courseId: idCurso },
        orderBy: { date: 'asc' },
        select: { date: true },
    });
    if (!primerRegistro || !esDurantePrimerasDosSemanas(primerRegistro.date, fecha)) return;

    for (const idEstudiante of [...new Set(idsEstudiantes)]) {
        const yaNotificado = await prisma.registroAuditoria.findFirst({
            where: {
                userId: idEstudiante,
                action: ACCION_ALERTA_RIESGO,
                target: 'COURSE',
                targetId: idCurso,
            },
            select: { id: true },
        });
        if (yaNotificado) continue;

        const registros = await prisma.asistencia.findMany({
            where: {
                courseId: idCurso,
                studentId: idEstudiante,
                date: { gte: primerRegistro.date, lte: fecha },
            },
            include: { student: { select: { name: true, email: true } } },
        });
        const estudiante = registros[0]?.student;
        if (!estudiante?.email) continue;

        const riesgo = evaluarRiesgoPerdidaTemprana(curso, registros);
        if (!riesgo.enRiesgo) continue;

        const resultadoCorreo = await enviarCorreo({
            to: estudiante.email,
            toName: estudiante.name,
            subject: `Alerta de posible pérdida por inasistencias - ${curso.name}`,
            htmlContent: construirCorreoRiesgoPerdidaHTML({
                studentName: estudiante.name,
                courseName: curso.name,
                percentage: riesgo.porcentajeAsistencia,
                absences: riesgo.unidadesAusentes,
                threshold: riesgo.umbralPerdida,
            }),
        });

        if (!resultadoCorreo.success) {
            console.error(`[early-loss-risk] No se pudo notificar a ${estudiante.email}: ${resultadoCorreo.error}`);
            continue;
        }

        await prisma.registroAuditoria.create({
            data: {
                userId: idEstudiante,
                userName: estudiante.name,
                userRole: 'STUDENT',
                action: ACCION_ALERTA_RIESGO,
                target: 'COURSE',
                targetId: idCurso,
                details: {
                    porcentajeAsistencia: riesgo.porcentajeAsistencia,
                    unidadesAusentes: riesgo.unidadesAusentes,
                    umbralPerdida: riesgo.umbralPerdida,
                },
            },
        });
        console.log(`[early-loss-risk] Alerta enviada a ${estudiante.email} para ${curso.name}.`);
    }
}