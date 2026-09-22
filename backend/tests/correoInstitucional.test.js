import test from 'node:test'
import assert from 'node:assert/strict'
import { esCorreoInstitucional, normalizarCorreo } from '../src/lib/correoInstitucional.js'

test('acepta los dominios institucionales permitidos', () => {
    assert.equal(esCorreoInstitucional('Persona@correo.uts.edu.co'), true)
    assert.equal(esCorreoInstitucional('persona@uts.edu.co'), true)
})

test('rechaza otros dominios y formatos inválidos', () => {
    assert.equal(esCorreoInstitucional('persona@gmail.com'), false)
    assert.equal(esCorreoInstitucional('persona@sub.correo.uts.edu.co'), false)
    assert.equal(esCorreoInstitucional('@uts.edu.co'), false)
})

test('normaliza el correo antes de guardarlo', () => {
    assert.equal(normalizarCorreo('  Persona@UTS.EDU.CO  '), 'persona@uts.edu.co')
    assert.equal(normalizarCorreo('   '), null)
})