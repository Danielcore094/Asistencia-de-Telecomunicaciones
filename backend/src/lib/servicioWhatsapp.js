/**
 * servicioWhatsapp.js
 * Servicio para enviar mensajes de WhatsApp usando Evolution API.
 * No requiere SDK externo — usa fetch nativo de Node.js 18+.
 */

/**
 * Normaliza un número de teléfono al formato que espera Evolution API.
 * Evolution API requiere: código de país + número, sin '+' ni espacios.
 *
 * Regla para Colombia (números locales de 10 dígitos que inician con 3):
 *   "3043755772"   →  "573043755772"
 *   "+573043755772" → "573043755772"
 *   "573043755772"  → "573043755772"  (ya está bien)
 *
 * @param {string} rawNumber - Número tal como está guardado en la BD
 * @returns {string} Número normalizado
 */
function normalizarNumeroTelefono(numeroOriginal) {
    // Eliminar todo lo que no sea dígito
    const digits = numeroOriginal.replace(/\D/g, '');

    // Ya tiene código de país Colombia (57) — 12 dígitos
    if (digits.length === 12 && digits.startsWith('57')) {
        return digits;
    }

    // Número colombiano local de 10 dígitos que empieza en 3
    if (digits.length === 10 && digits.startsWith('3')) {
        return `57${digits}`;
    }

    // Para cualquier otro caso, retornar los dígitos tal cual
    // (el caller decidirá si saltarse el envío)
    return digits;
}

/**
 * Envía un mensaje de texto por WhatsApp usando Evolution API.
 *
 * @param {Object} options
 * @param {string} options.phone   - Número de teléfono (cualquier formato)
 * @param {string} options.message - Texto del mensaje
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
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

    // Compatibilidad entre versiones de Evolution API:
    // algunas aceptan `text` y otras leen `textMessage.text`.
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
