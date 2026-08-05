import prisma from '../lib/prisma.js';
import { buildEarlyLossRiskEmailHTML, sendEmail } from '../lib/emailService.js';
import { esDurantePrimerasDosSemanas, evaluarRiesgoPerdidaTemprana } from '../lib/attendanceRisk.js';

const ACCION_ALERTA_RIESGO = 'ALERTA_POSIBLE_PERDIDA';

export async function runEarlyLossRiskNotification({ courseId, studentIds, date }) {
    const curso = await prisma.curso.findUnique({
        where: { id: courseId },
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
        where: { courseId },
        orderBy: { date: 'asc' },
        select: { date: true },
    });
    if (!primerRegistro || !esDurantePrimerasDosSemanas(primerRegistro.date, date)) return;

    for (const studentId of [...new Set(studentIds)]) {
        const yaNotificado = await prisma.registroAuditoria.findFirst({
            where: {
                userId: studentId,
                action: ACCION_ALERTA_RIESGO,
                target: 'COURSE',
                targetId: courseId,
            },
            select: { id: true },
        });
        if (yaNotificado) continue;

        const registros = await prisma.asistencia.findMany({
            where: { courseId, studentId, date: { gte: primerRegistro.date, lte: date } },
            include: { student: { select: { name: true, email: true } } },
        });
        const estudiante = registros[0]?.student;
        if (!estudiante?.email) continue;

        const riesgo = evaluarRiesgoPerdidaTemprana(curso, registros);
        if (!riesgo.enRiesgo) continue;

        const resultadoCorreo = await sendEmail({
            to: estudiante.email,
            toName: estudiante.name,
            subject: `Alerta de posible pérdida por inasistencias - ${curso.name}`,
            htmlContent: buildEarlyLossRiskEmailHTML({
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
                userId: studentId,
                userName: estudiante.name,
                userRole: 'STUDENT',
                action: ACCION_ALERTA_RIESGO,
                target: 'COURSE',
                targetId: courseId,
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