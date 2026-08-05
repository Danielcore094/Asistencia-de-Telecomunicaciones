import test from 'node:test';
import assert from 'node:assert/strict';
import { esDurantePrimerasDosSemanas, evaluarRiesgoPerdidaTemprana } from '../src/lib/attendanceRisk.js';

const curso = {
    dia: 'Martes',
    horaInicio: '18:30',
    horaFin: '21:30',
    dia2: null,
    horaInicio2: null,
    horaFin2: null,
};

test('solo evalúa registros dentro de los catorce días posteriores al primer registro', () => {
    assert.equal(esDurantePrimerasDosSemanas('2026-08-04', '2026-08-04'), true);
    assert.equal(esDurantePrimerasDosSemanas('2026-08-04', '2026-08-17'), true);
    assert.equal(esDurantePrimerasDosSemanas('2026-08-04', '2026-08-18'), false);
});

test('identifica posible pérdida cuando la asistencia temprana cae al 80 por ciento o menos', () => {
    const resultado = evaluarRiesgoPerdidaTemprana(curso, [
        { date: '2026-07-07', status: 'Ausente' },
        { date: '2026-07-14', status: 'Ausente' },
    ]);

    assert.deepEqual(resultado, {
        unidadesAusentes: 8,
        umbralPerdida: 13,
        porcentajeAsistencia: 0,
        enRiesgo: true,
    });
});

test('las inasistencias justificadas no aportan al riesgo de pérdida', () => {
    const resultado = evaluarRiesgoPerdidaTemprana(curso, [
        { date: '2026-07-07', status: 'Presente' },
        { date: '2026-07-14', status: 'Justificado' },
    ]);

    assert.equal(resultado.unidadesAusentes, 0);
    assert.equal(resultado.porcentajeAsistencia, 100);
    assert.equal(resultado.enRiesgo, false);
});