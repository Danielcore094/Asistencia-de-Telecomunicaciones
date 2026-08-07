import { createHash } from 'node:crypto'

const registrosLocales = new Map()
const urlRedis = process.env.UPSTASH_REDIS_REST_URL
const tokenRedis = process.env.UPSTASH_REDIS_REST_TOKEN
const usaRedis = Boolean(urlRedis && tokenRedis)
const esProduccion = process.env.NODE_ENV === 'production'
const prefijoRedis = 'asistencia:limite-inicios-sesion:'

const scriptConsumirCupo = `
local intentos = redis.call('INCR', KEYS[1])
if intentos == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
if intentos > tonumber(ARGV[2]) then
    return 0
end
return 1
`

const obtenerConfiguracion = () => {
    const ventanaMilisegundos = Number.parseInt(process.env.VENTANA_INTENTOS_INICIO_SESION_MS || '900000', 10);
    const maximoIntentos = Number.parseInt(process.env.MAXIMO_INTENTOS_INICIO_SESION || '5', 10);

    return {
        ventanaMilisegundos: Number.isFinite(ventanaMilisegundos) && ventanaMilisegundos > 0 ? ventanaMilisegundos : 900000,
        maximoIntentos: Number.isFinite(maximoIntentos) && maximoIntentos > 0 ? maximoIntentos : 5,
    };
}

const obtenerClaveRedis = (clave) => `${prefijoRedis}${createHash('sha256').update(clave).digest('hex')}`

const ejecutarComandoRedis = async (comando) => {
    const respuesta = await fetch(urlRedis, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${tokenRedis}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(comando),
        signal: AbortSignal.timeout(3000),
    })

    if (!respuesta.ok) {
        throw new Error(`Redis respondió con estado ${respuesta.status}`)
    }

    const cuerpo = await respuesta.json()
    if (cuerpo.error) {
        throw new Error(`Redis respondió con error: ${cuerpo.error}`)
    }

    return cuerpo.result
}

const consumirCupoLocal = (clave, ventanaMilisegundos, maximoIntentos) => {
    const ahora = Date.now()
    const registro = registrosLocales.get(clave)

    if (!registro || ahora - registro.inicioVentana >= ventanaMilisegundos) {
        registrosLocales.set(clave, { inicioVentana: ahora, intentos: 1 })
        return true
    }

    registro.intentos += 1
    return registro.intentos <= maximoIntentos
}

export const consumirCupo = async (clave) => {
    const { ventanaMilisegundos, maximoIntentos } = obtenerConfiguracion();

    if (usaRedis) {
        const resultado = await ejecutarComandoRedis([
            'EVAL',
            scriptConsumirCupo,
            '1',
            obtenerClaveRedis(clave),
            String(ventanaMilisegundos),
            String(maximoIntentos),
        ])
        return resultado === 1
    }

    if (esProduccion) {
        throw new Error('UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son obligatorios en producción')
    }

    return consumirCupoLocal(clave, ventanaMilisegundos, maximoIntentos)
}

export const limpiarIntentos = async (clave) => {
    if (usaRedis) {
        await ejecutarComandoRedis(['DEL', obtenerClaveRedis(clave)])
        return
    }

    registrosLocales.delete(clave)
}