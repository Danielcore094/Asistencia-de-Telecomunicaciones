
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
        return { success: false, error: msg };
    }

    const number = normalizarNumeroTelefono(phone);

    const textoLimpio = String(message ?? '').trim();
    if (!textoLimpio) {
        const msg = 'El mensaje de WhatsApp está vacío';
        console.error('[servicioWhatsapp]', msg);
        return { success: false, error: msg };
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
            return { success: false, error: `Evolution ${response.status}: ${errorBody}` };
        }

        const data = await response.json();
        console.log(`[servicioWhatsapp] ✅ Mensaje enviado a ${number} — key: ${data.key?.id ?? 'ok'}`);
        return { success: true };

    } catch (err) {
        console.error('[servicioWhatsapp] Error de red:', err.message);
        return { success: false, error: err.message };
    }
}
