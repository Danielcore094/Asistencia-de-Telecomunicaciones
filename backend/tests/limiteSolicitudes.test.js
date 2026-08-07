import test from 'node:test'
import assert from 'node:assert/strict'
import { consumirCupo, limpiarIntentos } from '../src/lib/limiteSolicitudes.js'

const configuracionOriginal = {
    maximo: process.env.MAXIMO_INTENTOS_INICIO_SESION,
    ventana: process.env.VENTANA_INTENTOS_INICIO_SESION_MS,
}

test.after(() => {
    if (configuracionOriginal.maximo === undefined) delete process.env.MAXIMO_INTENTOS_INICIO_SESION
    else process.env.MAXIMO_INTENTOS_INICIO_SESION = configuracionOriginal.maximo

    if (configuracionOriginal.ventana === undefined) delete process.env.VENTANA_INTENTOS_INICIO_SESION_MS
    else process.env.VENTANA_INTENTOS_INICIO_SESION_MS = configuracionOriginal.ventana
})

test('limita los intentos locales dentro de la ventana configurada', async () => {
    process.env.MAXIMO_INTENTOS_INICIO_SESION = '2'
    process.env.VENTANA_INTENTOS_INICIO_SESION_MS = '60000'
    const clave = `prueba-limite-${Date.now()}`

    assert.equal(await consumirCupo(clave), true)
    assert.equal(await consumirCupo(clave), true)
    assert.equal(await consumirCupo(clave), false)
    await limpiarIntentos(clave)
})

test('restablece el límite local después de un inicio de sesión exitoso', async () => {
    process.env.MAXIMO_INTENTOS_INICIO_SESION = '1'
    process.env.VENTANA_INTENTOS_INICIO_SESION_MS = '60000'
    const clave = `prueba-limpieza-${Date.now()}`

    assert.equal(await consumirCupo(clave), true)
    await limpiarIntentos(clave)
    assert.equal(await consumirCupo(clave), true)
    await limpiarIntentos(clave)
})