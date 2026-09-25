import test from 'node:test';
import assert from 'node:assert/strict';
import {
    formatearFechaBogota,
    obtenerRangoSemanaActual,
    obtenerLunesSemana,
    obtenerRangoSemanaAnterior,
    obtenerPeriodoAcademicoActual,
    obtenerSemanaAcademica,
} from '../src/lib/utilidadesFechas.js';

test('obtenerPeriodoAcademicoActual separa el año y los dos periodos semestrales', () => {
    assert.deepEqual(obtenerPeriodoAcademicoActual(new Date('2026-01-01T05:00:00.000Z')), { anio: '2026', periodo: '1' });
    assert.deepEqual(obtenerPeriodoAcademicoActual(new Date('2026-06-30T15:00:00.000Z')), { anio: '2026', periodo: '1' });
    assert.deepEqual(obtenerPeriodoAcademicoActual(new Date('2026-07-01T05:00:00.000Z')), { anio: '2026', periodo: '2' });
    assert.deepEqual(obtenerPeriodoAcademicoActual(new Date('2026-12-31T15:00:00.000Z')), { anio: '2026', periodo: '2' });
    assert.deepEqual(obtenerPeriodoAcademicoActual(new Date('2027-01-01T05:00:00.000Z')), { anio: '2027', periodo: '1' });
});

test('obtenerSemanaAcademica cuenta desde la semana que contiene el inicio del periodo', () => {
    const referenceDate = new Date('2026-11-02T12:00:00.000Z');

    assert.equal(obtenerSemanaAcademica({ referenceDate, weekStart: '2026-10-19' }), 17);
    assert.equal(obtenerSemanaAcademica({ referenceDate, weekStart: '2026-10-26' }), 18);
});

test('formatearFechaBogota usa la fecha correspondiente a America/Bogota', () => {
    assert.equal(formatearFechaBogota(new Date('2026-08-03T02:00:00.000Z')), '2026-08-02');
});

test('obtenerLunesSemana calcula el lunes para cualquier día de la semana', () => {
    assert.equal(obtenerLunesSemana('2026-08-02'), '2026-07-27');
    assert.equal(obtenerLunesSemana('2026-08-05'), '2026-08-03');
});

test('obtenerRangoSemanaActual devuelve el intervalo de lunes a sábado', () => {
    const rango = obtenerRangoSemanaActual(new Date('2026-08-05T15:00:00.000Z'));

    assert.deepEqual(rango, {
        weekStart: '2026-08-03',
        weekEnd: '2026-08-08',
    });
});

test('obtenerRangoSemanaAnterior devuelve la semana cerrada anterior', () => {
    const rango = obtenerRangoSemanaAnterior(new Date('2026-08-09T15:00:00.000Z'));

    assert.deepEqual(rango, {
        weekStart: '2026-07-27',
        weekEnd: '2026-08-01',
    });
});