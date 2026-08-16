const obtenerSesiones = (curso) => [
    {
        dia: curso.dia,
        horaInicio: curso.horaInicio,
        horaFin: curso.horaFin,
    },
    {
        dia: curso.dia2,
        horaInicio: curso.horaInicio2,
        horaFin: curso.horaFin2,
    },
].filter(({ dia, horaInicio, horaFin }) => dia && horaInicio && horaFin);

export const encontrarConflictoHorario = (curso, cursosExistentes) => {
    const sesionesCurso = obtenerSesiones(curso);

    for (const cursoExistente of cursosExistentes) {
        for (const sesion of sesionesCurso) {
            const conflicto = obtenerSesiones(cursoExistente).find((sesionExistente) =>
                sesion.dia === sesionExistente.dia
                && sesion.horaInicio === sesionExistente.horaInicio
                && sesion.horaFin === sesionExistente.horaFin
            );

            if (conflicto) {
                return {
                    curso: cursoExistente,
                    dia: sesion.dia,
                    horaInicio: sesion.horaInicio,
                    horaFin: sesion.horaFin,
                };
            }
        }
    }

    return null;
};