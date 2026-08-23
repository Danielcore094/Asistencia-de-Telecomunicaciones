
function normalizarNumeroTelefono(numeroOriginal) {
    const digits = numeroOriginal.replace(/\D/g, '');

    if (digits.length === 12 && digits.startsWith('57')) {
        return digits;
    }

    if (digits.length === 10 && digits.startsWith('3')) {
        return `57${digits}`;
    }

    return digits;
}

export async function enviarMensajeWhatsApp({ phone, message }) {
    const baseUrl  = process.env.EVOLUTION_API_URL;
    const apiKey   = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    if (!baseUrl || !instance) {
        const msg = 'EVOLUTION_API_URL y EVOLUTION_INSTANCE son requeridas en el .env';
        console.error('[servicioWhatsapp]', msg);
        return { success: false, error: 'El servicio de WhatsApp no está configurado. Contacte al administrador.' };
    }

    const number = normalizarNumeroTelefono(phone);

    const textoLimpio = String(message ?? '').trim();
    if (!textoLimpio) {
        const msg = 'El mensaje de WhatsApp está vacío';
        console.error('[servicioWhatsapp]', msg);
        return { success: false, error: 'No se pudo enviar la notificación porque el mensaje está vacío.' };
    }

    const url = `${baseUrl}/message/sendText/${instance}`;

    const payload = {
        number,
        text: textoLimpio,
        textMessage: {
            text: textoLimpio,
        },
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { apikey: apiKey } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[servicioWhatsapp] Error Evolution API (${response.status}):`, errorBody);
            const mensajesPorEstado = {
                400: 'WhatsApp rechazó el número o los datos del mensaje. Verifique el número registrado y reintente.',
                401: 'La conexión con WhatsApp fue rechazada. Verifique la clave de la API.',
                403: 'La conexión con WhatsApp no tiene autorización para enviar mensajes.',
                404: 'La instancia de WhatsApp no fue encontrada o no está disponible.',
                408: 'WhatsApp tardó demasiado en responder. Intente nuevamente.',
                429: 'WhatsApp está limitando los envíos temporalmente. Intente nuevamente más tarde.',
            };
            return {
                success: false,
                error: mensajesPorEstado[response.status]
                    || `El servicio de WhatsApp rechazó el envío (código ${response.status}). Intente nuevamente.`,
            };
        }

        const data = await response.json();
        console.log(`[servicioWhatsapp] ✅ Mensaje enviado a ${number} — key: ${data.key?.id ?? 'ok'}`);
        return { success: true };

    } catch (err) {
        console.error('[servicioWhatsapp] Error de red:', err.message);
        return {
            success: false,
            error: 'No fue posible conectarse con el servicio de WhatsApp. Verifique que esté disponible e intente nuevamente.',
        };
    }
}
