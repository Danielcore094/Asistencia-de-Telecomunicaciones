import test from 'node:test';
import assert from 'node:assert/strict';
import { encontrarConflictoHorario } from '../src/lib/horarioCurso.js';

const cursoExistente = {
    id: 'curso-existente',
    name: 'Redes de datos',
    dia: 'Martes',
    horaInicio: '20:15',
    horaFin: '22:00',
    dia2: 'Jueves',
    horaInicio2: '20:15',
    horaFin2: '22:00',
};

test('detecta una sesión idéntica en el primer día', () => {
    const conflicto = encontrarConflictoHorario({
        dia: 'Martes',
        horaInicio: '20:15',
        horaFin: '22:00',
    }, [cursoExistente]);

    assert.deepEqual(conflicto, {
        curso: cursoExistente,
        dia: 'Martes',
        horaInicio: '20:15',
        horaFin: '22:00',
    });
});

test('detecta conflictos entre el segundo día y el primer día de otra materia', () => {
    const conflicto = encontrarConflictoHorario({
        dia: 'Lunes',
        horaInicio: '18:00',
        horaFin: '19:45',
        dia2: 'Martes',
        horaInicio2: '20:15',
        horaFin2: '22:00',
    }, [cursoExistente]);

    assert.equal(conflicto?.curso.id, 'curso-existente');
    assert.equal(conflicto?.dia, 'Martes');
});

test('permite sesiones con hora, día o duración diferentes', () => {
    const conflicto = encontrarConflictoHorario({
        dia: 'Martes',
        horaInicio: '20:15',
        horaFin: '21:45',
    }, [cursoExistente]);

    assert.equal(conflicto, null);
});