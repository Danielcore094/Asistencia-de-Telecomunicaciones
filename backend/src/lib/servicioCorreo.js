
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function enviarCorreo({ to, toName, subject, htmlContent, attachments = [] }) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'Sistema de Asistencia';

    if (!apiKey || !senderEmail) {
        const msg = 'BREVO_API_KEY y BREVO_SENDER_EMAIL son requeridas en el .env';
        console.error('[servicioCorreo]', msg);
        return { success: false, error: msg };
    }

    const payload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: toName }],
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
        console.log(`[servicioCorreo] Correo enviado a ${to} — messageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };

    } catch (err) {
        console.error('[servicioCorreo] Error de red:', err.message);
        return { success: false, error: err.message };
    }
}

export function construirCorreoInasistenciasHTML({ studentName, totalAbsences, courses, weekStart, weekEnd }) {
    const courseList = courses.map(c => `<li style="margin: 4px 0;">${c}</li>`).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">
        📋 Reporte Semanal de Inasistencias
      </h1>
      <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">
        Semana del ${weekStart} al ${weekEnd}
      </p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
        Estimado/a <strong>${studentName}</strong>,
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        El sistema de control de asistencia ha registrado inasistencias durante la semana académica.
      </p>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #1e40af; font-size: 16px; margin: 0 0 12px;">📊 Resumen de la semana</h2>
        <p style="color: #1e3a8a; font-size: 28px; font-weight: 700; margin: 0 0 12px;">
          ${totalAbsences} ${totalAbsences === 1 ? 'falta' : 'faltas'} registradas
        </p>
        <p style="color: #374151; font-size: 14px; margin: 0 0 8px;"><strong>Asignaturas con inasistencias:</strong></p>
        <ul style="color: #4b5563; font-size: 14px; margin: 0; padding-left: 20px;">
          ${courseList}
        </ul>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Le recomendamos revisar su asistencia y comunicarse con el docente correspondiente en caso de ser necesario.
      </p>
    </div>

    <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Este mensaje es una notificación automática del sistema de control de asistencia.<br>
        Por favor no responda a este correo.
      </p>
    </div>
  </div>
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
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Durante las primeras dos semanas de <strong>${courseName}</strong>, el sistema identificó inasistencias que podrían indicar riesgo de pérdida de la materia.</p>
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

export function construirCorreoReporteSemanalHTML({ weekStart, weekEnd, courseCount, totalRecords }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">📦 Reporte Semanal de Materias Activas</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Semana del ${weekStart} al ${weekEnd}</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Adjuntamos el reporte en formato Excel con una hoja por materia activa.</p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #1e40af; font-size: 16px; margin: 0 0 8px;"><strong>Resumen del reporte</strong></p>
        <ul style="color: #4b5563; font-size: 14px; margin: 0; padding-left: 20px;">
          <li>Total de materias activas: <strong>${courseCount}</strong></li>
          <li>Total de registros de asistencia en la semana: <strong>${totalRecords}</strong></li>
        </ul>
      </div>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">El archivo contiene una hoja separada por cada materia activa y muestra los registros de asistencia del periodo.</p>
    </div>
    <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Este es un correo automático generado por el sistema de asistencia.</p>
    </div>
  </div>
</body>
</html>`;
}
