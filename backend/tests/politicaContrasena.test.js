import test from 'node:test'
import assert from 'node:assert/strict'
import { obtenerErrorContrasena } from '../src/lib/politicaContrasena.js'

test('acepta una contraseña que cumple la política', () => {
    assert.equal(obtenerErrorContrasena('ClaveSegura1!'), null)
})

test('rechaza contraseñas cortas o sin los tipos requeridos', () => {
    assert.equal(obtenerErrorContrasena('C1!a'), 'La contraseña debe tener al menos 8 caracteres')
    assert.equal(
        obtenerErrorContrasena('clavesegura1!'),
        'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales'
    )
})

test('rechaza contraseñas que superan el límite permitido', () => {
    assert.equal(obtenerErrorContrasena(`Clave1!${'a'.repeat(122)}`), 'La contraseña no puede superar 128 caracteres')
})