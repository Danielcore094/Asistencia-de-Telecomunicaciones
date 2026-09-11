import test from 'node:test'
import assert from 'node:assert/strict'
import { enviarMensajeWhatsApp } from '../src/lib/servicioWhatsapp.js'

const configuracionOriginal = {
    url: process.env.EVOLUTION_API_URL,
    instancia: process.env.EVOLUTION_INSTANCE,
    intentos: process.env.WHATSAPP_RETRY_ATTEMPTS,
    espera: process.env.WHATSAPP_RETRY_DELAY_MS,
}

test.after(() => {
    if (configuracionOriginal.url === undefined) delete process.env.EVOLUTION_API_URL
    else process.env.EVOLUTION_API_URL = configuracionOriginal.url

    if (configuracionOriginal.instancia === undefined) delete process.env.EVOLUTION_INSTANCE
    else process.env.EVOLUTION_INSTANCE = configuracionOriginal.instancia

    if (configuracionOriginal.intentos === undefined) delete process.env.WHATSAPP_RETRY_ATTEMPTS
    else process.env.WHATSAPP_RETRY_ATTEMPTS = configuracionOriginal.intentos

    if (configuracionOriginal.espera === undefined) delete process.env.WHATSAPP_RETRY_DELAY_MS
    else process.env.WHATSAPP_RETRY_DELAY_MS = configuracionOriginal.espera
})

test('reintenta una desconexión y envía cuando Evolution API vuelve', async () => {
    process.env.EVOLUTION_API_URL = 'https://evolution.test'
    process.env.EVOLUTION_INSTANCE = 'asistencia'
    process.env.WHATSAPP_RETRY_ATTEMPTS = '3'
    process.env.WHATSAPP_RETRY_DELAY_MS = '0'

    let intentos = 0
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = async () => {
        intentos++
        if (intentos === 1) throw new Error('Servicio desconectado')
        return { ok: true, json: async () => ({ key: { id: 'mensaje-1' } }) }
    }

    try {
        const resultado = await enviarMensajeWhatsApp({ phone: '3001234567', message: 'Prueba' })
        assert.deepEqual(resultado, { success: true })
        assert.equal(intentos, 2)
    } finally {
        globalThis.fetch = fetchOriginal
    }
})

test('no reintenta un número rechazado por Evolution API', async () => {
    process.env.EVOLUTION_API_URL = 'https://evolution.test'
    process.env.EVOLUTION_INSTANCE = 'asistencia'
    process.env.WHATSAPP_RETRY_ATTEMPTS = '3'
    process.env.WHATSAPP_RETRY_DELAY_MS = '0'

    let intentos = 0
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = async () => {
        intentos++
        return {
            ok: false,
            status: 400,
            text: async () => 'Número inválido',
        }
    }

    try {
        const resultado = await enviarMensajeWhatsApp({ phone: '3001234567', message: 'Prueba' })
        assert.equal(resultado.success, false)
        assert.match(resultado.error, /rechazó el número/)
        assert.equal(intentos, 1)
    } finally {
        globalThis.fetch = fetchOriginal
    }
})