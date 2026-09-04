
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function enviarCorreo({ to, toName, subject, htmlContent, attachments = [] }) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'Sistema de Asistencia';
  const destinatarios = (Array.isArray(to) ? to : String(to).split(/[;,]/))
    .map(destinatario => typeof destinatario === 'string' ? destinatario.trim() : destinatario?.email)
    .filter(Boolean)
    .map(email => ({ email, name: toName }));

    if (!apiKey || !senderEmail) {
        const msg = 'BREVO_API_KEY y BREVO_SENDER_EMAIL son requeridas en el .env';
        console.error('[servicioCorreo]', msg);
        return { success: false, error: msg };
    }

    const payload = {
        sender: { name: senderName, email: senderEmail },
      to: destinatarios,
        subject,
        htmlContent,
    };

    if (attachments.length > 0) {
        payload.attachment = attachments.map(({ name, content }) => ({ name, content }));
    }

    try {
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[servicioCorreo] Error Brevo (${response.status}):`, errorBody);
            return { success: false, error: `Brevo ${response.status}: ${errorBody}` };
        }

        const data = await response.json();
        console.log(`[servicioCorreo] Correo enviado a ${destinatarios.map(destinatario => destinatario.email).join(', ')} — messageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };

    } catch (err) {
        console.error('[servicioCorreo] Error de red:', err.message);
        return { success: false, error: err.message };
    }
}

export function construirCorreoSegundoFactorHTML({ userName, code }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; color: #334155;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px 24px; text-align: center;">
    <h1 style="color: #6B2D8B; font-size: 22px;">Código de verificación</h1>
    <p style="font-size: 16px;">Hola <strong>${userName}</strong>, usa este código para completar tu inicio de sesión:</p>
    <p style="margin: 28px 0; color: #6B2D8B; font-size: 34px; letter-spacing: 8px; font-weight: 700;">${code}</p>
    <p style="color: #64748b; font-size: 14px;">El código vence en 10 minutos y solo puede utilizarse una vez.</p>
    <p style="color: #94a3b8; font-size: 12px;">Si no intentaste iniciar sesión, cambia tu contraseña y contacta al administrador.</p>
  </div>
</body>
</html>`;
}

export function construirCorreoBienvenidaHTML({ userName, email, password, loginUrl }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #6B2D8B; padding: 28px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Bienvenido al Sistema de Asistencia</h1>
    </div>
    <div style="padding: 28px 24px; color: #334155;">
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Se ha creado tu acceso al Sistema de Control de Asistencia de Telecomunicaciones.</p>
      <p style="margin: 24px 0 12px;">Tus credenciales son:</p>
      <ul style="list-style: none; padding: 0; margin: 0 0 24px;">
        <li><strong>Correo:</strong> ${email}</li>
        <li><strong>Contraseña temporal:</strong> ${password}</li>
      </ul>
      <p>Al ingresar por primera vez, el sistema te solicitará cambiar esta contraseña por una nueva.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #8DC63F; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 700;">Ir a iniciar sesión</a>
      </div>
      <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin: 0;">Si tienes problemas para iniciar sesión, contacta al administrador del sistema.</p>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; color: #94a3b8; font-size: 12px; text-align: center;">
      <p style="margin: 0;">UTS - Sistema de Asistencia de Telecomunicaciones</p>
    </div>
  </div>
</body>
</html>`;
}
export function construirCorreoInasistenciasHTML({ studentName, totalAbsences, courses, weekStart, weekEnd }) {
    const courseList = courses.map(c => `<li style="margin: 4px 0;">${c}</li>`).join('');
    const textoFaltas = totalAbsences === 1 ? 'falta registrada' : 'faltas registradas';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen semanal de asistencia</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #eef2f7; margin: 0; padding: 32px 16px; color: #26354a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto;">
    <tr>
      <td style="background-color: #173f6d; border-radius: 16px 16px 0 0; padding: 28px 32px;">
        <p style="margin: 0 0 18px; color: #8dc63f; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">UTS | Asistencia académica</p>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; line-height: 1.2; font-weight: 700;">Resumen semanal de asistencia</h1>
        <p style="margin: 10px 0 0; color: #d7e5f5; font-size: 14px; line-height: 1.5;">Semana del ${weekStart} al ${weekEnd}</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #ffffff; padding: 34px 32px 30px;">
        <p style="margin: 0 0 10px; color: #26354a; font-size: 17px; line-height: 1.5;">Estimado/a <strong>${studentName}</strong>,</p>
        <p style="margin: 0 0 26px; color: #536274; font-size: 15px; line-height: 1.7;">El sistema registró inasistencias en tus asignaturas durante la semana académica indicada.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f8ec; border: 1px solid #d5e7b8; border-radius: 12px;">
          <tr>
            <td style="padding: 22px 24px;">
              <p style="margin: 0 0 8px; color: #4f6f25; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;">Total de la semana</p>
              <p style="margin: 0; color: #173f6d; font-size: 30px; line-height: 1.15; font-weight: 700;">${totalAbsences} <span style="font-size: 17px; font-weight: 600;">${textoFaltas}</span></p>
            </td>
          </tr>
        </table>

        <p style="margin: 28px 0 10px; color: #26354a; font-size: 14px; font-weight: 700;">Asignaturas con inasistencias</p>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #536274; font-size: 14px; line-height: 1.8;">
          ${courseList}
        </ul>

        <p style="margin: 28px 0 0; padding-top: 22px; border-top: 1px solid #e5eaf0; color: #536274; font-size: 14px; line-height: 1.7;">Te recomendamos revisar tu asistencia y comunicarte con el docente correspondiente si consideras que alguno de estos registros requiere revisión.</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f7f9fb; border-top: 1px solid #e5eaf0; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; color: #8190a3; font-size: 12px; line-height: 1.6;">Notificación automática del Sistema de Asistencia de Telecomunicaciones.<br>Por favor, no respondas a este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function construirCorreoRiesgoPerdidaHTML({ studentName, courseName, percentage, absences, threshold }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #6b2d8b; padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Alerta temprana de asistencia</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Estimado/a <strong>${studentName}</strong>,</p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Durante la semana actual el sistema identificó inasistencia(s) en la materia <strong>${courseName}</strong>, lo cual podría indicar riesgo en la pérdida de la materia.</p>
      <div style="background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #9a3412; font-size: 16px; margin: 0 0 10px;"><strong>Resumen actual</strong></p>
        <p style="color: #4b5563; font-size: 14px; margin: 0 0 8px;">Asistencia registrada: <strong>${percentage}%</strong></p>
        <p style="color: #4b5563; font-size: 14px; margin: 0 0 8px;">Unidades de ausencia acumuladas: <strong>${absences}</strong></p>
        <p style="color: #4b5563; font-size: 14px; margin: 0;">Umbral estimado de pérdida por inasistencias: <strong>${threshold}</strong></p>
      </div>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">Esta es una alerta preventiva, no una declaración de pérdida. Le recomendamos verificar su asistencia y comunicarse con el docente si considera que existe un error.</p>
    </div>
    <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Este es un correo automático del sistema de control de asistencia. Por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>`;
}

export function construirCorreoReporteSemanalHTML({ teacherName = '', weekStart, weekEnd, courseCount, totalRecords, absentRecords = 0, absentStudents = 0, absencePercentage = 0, absentStudentNames = [], includeAbsentNames = false, includeSemestral = false }) {
  const detalleDocente = teacherName ? `<p style="margin: 0 0 10px; color: #536274; font-size: 14px; line-height: 1.5;"><strong>Docente:</strong> ${teacherName}</p>` : '';
  const nombresAusentes = absentStudentNames.length > 0 ? absentStudentNames.join(', ') : 'Ninguno';
  const detalleAdjuntos = includeSemestral
    ? 'Adjuntamos el reporte semanal general y el resumen semestral de asistencia en archivos Excel separados.'
    : 'Adjuntamos el archivo Excel con el detalle de las materias, grupos y registros de asistencia correspondientes a la semana.';
  const detalleAusentes = includeAbsentNames
    ? `<p style="margin: 0 0 26px; color: #536274; font-size: 14px; line-height: 1.7;"><strong>Estudiantes que faltaron:</strong> ${nombresAusentes}</p>`
    : '';
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte semanal de asistencia</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #eef2f7; margin: 0; padding: 32px 16px; color: #26354a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto;">
    <tr>
      <td style="background-color: #173f6d; border-radius: 16px 16px 0 0; padding: 28px 32px;">
        <p style="margin: 0 0 18px; color: #8dc63f; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">UTS | Gestión académica</p>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; line-height: 1.2; font-weight: 700;">Reporte semanal de asistencia</h1>
        <p style="margin: 10px 0 0; color: #d7e5f5; font-size: 14px; line-height: 1.5;">Semana del ${weekStart} al ${weekEnd}</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #ffffff; padding: 34px 32px 30px;">
        <p style="margin: 0 0 10px; color: #26354a; font-size: 17px; line-height: 1.5;">Reporte listo para revisión</p>
        ${detalleDocente}
        <p style="margin: 0 0 12px; color: #536274; font-size: 15px; line-height: 1.7;">${detalleAdjuntos} Se registraron ${absentRecords} inasistencias de ${absentStudents} estudiantes.</p>
        <p style="margin: 0 0 26px; color: #536274; font-size: 14px; line-height: 1.7;"><strong>Porcentaje de inasistencias:</strong> ${absencePercentage}%</p>
        ${detalleAusentes}

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f8ec; border: 1px solid #d5e7b8; border-radius: 12px;">
          <tr>
            <td width="50%" style="padding: 22px 20px; border-right: 1px solid #d5e7b8;">
              <p style="margin: 0 0 8px; color: #4f6f25; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;">Materias activas</p>
              <p style="margin: 0; color: #173f6d; font-size: 30px; line-height: 1.15; font-weight: 700;">${courseCount}</p>
            </td>
            <td width="50%" style="padding: 22px 20px;">
              <p style="margin: 0 0 8px; color: #4f6f25; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;">Registros de asistencia</p>
              <p style="margin: 0; color: #173f6d; font-size: 30px; line-height: 1.15; font-weight: 700;">${totalRecords}</p>
            </td>
          </tr>
        </table>

        <p style="margin: 28px 0 0; padding-top: 22px; border-top: 1px solid #e5eaf0; color: #536274; font-size: 14px; line-height: 1.7;">El archivo contiene una hoja separada por cada materia activa. Puedes utilizarlo para consultar, validar y dar seguimiento a la asistencia del periodo.</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f7f9fb; border-top: 1px solid #e5eaf0; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; color: #8190a3; font-size: 12px; line-height: 1.6;">Notificación automática del Sistema de Asistencia de Telecomunicaciones.<br>Por favor, no respondas a este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

