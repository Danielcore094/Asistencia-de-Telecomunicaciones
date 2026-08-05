import test from 'node:test';
import assert from 'node:assert/strict';
import {
    fmtBogota,
    getCurrentWeekRange,
    getLunesSemana,
    getPreviousWeekRange,
} from '../src/lib/dateUtils.js';

test('fmtBogota usa la fecha correspondiente a America/Bogota', () => {
    assert.equal(fmtBogota(new Date('2026-08-03T02:00:00.000Z')), '2026-08-02');
});

test('getLunesSemana calcula el lunes para cualquier día de la semana', () => {
    assert.equal(getLunesSemana('2026-08-02'), '2026-07-27');
    assert.equal(getLunesSemana('2026-08-05'), '2026-08-03');
});

test('getCurrentWeekRange devuelve el intervalo de lunes a sábado', () => {
    const rango = getCurrentWeekRange(new Date('2026-08-05T15:00:00.000Z'));

    assert.deepEqual(rango, {
        weekStart: '2026-08-03',
        weekEnd: '2026-08-08',
    });
});

test('getPreviousWeekRange devuelve la semana cerrada anterior', () => {
    const rango = getPreviousWeekRange(new Date('2026-08-09T15:00:00.000Z'));

    assert.deepEqual(rango, {
        weekStart: '2026-07-27',
        weekEnd: '2026-08-01',
    });
});