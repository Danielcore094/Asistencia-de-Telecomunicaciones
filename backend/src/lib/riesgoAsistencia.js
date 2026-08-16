const SEMANAS_PERIODO = 16;
const MINUTOS_HORA_ACADEMICA = 45;

const convertirHoraAMinutos = (valor) => {
    if (!valor || typeof valor !== 'string') return null;
    const [hora, minuto] = valor.split(':').map(Number);
    if (Number.isNaN(hora) || Number.isNaN(minuto)) return null;
    return hora * 60 + minuto;
};

const calcularMinutosSesion = (inicio, fin) => {
    const inicioMinutos = convertirHoraAMinutos(inicio);
    const finMinutos = convertirHoraAMinutos(fin);
    if (inicioMinutos === null || finMinutos === null || finMinutos <= inicioMinutos) return 0;
    return finMinutos - inicioMinutos;
};

const normalizarDia = (dia) => dia?.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || null;

const diaSemanaDesdeFecha = (fecha) => {
    const fechaLocal = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(fechaLocal.getTime())) return null;
    return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaLocal.getDay()];
};

const unidadesRegistro = (curso, fecha) => {
    const unidadesDia1 = Math.max(1, Math.round(calcularMinutosSesion(curso.horaInicio, curso.horaFin) / MINUTOS_HORA_ACADEMICA));
    const unidadesDia2 = Math.max(0, Math.round(calcularMinutosSesion(curso.horaInicio2, curso.horaFin2) / MINUTOS_HORA_ACADEMICA));
    const diaRegistro = diaSemanaDesdeFecha(fecha);

    if (diaRegistro === normalizarDia(curso.dia)) return unidadesDia1;
    if (diaRegistro === normalizarDia(curso.dia2)) return unidadesDia2 || 1;
    return unidadesDia2 > 0 ? Math.max(unidadesDia1, unidadesDia2) : unidadesDia1;
};

export const esDurantePrimerasDosSemanas = (fechaPrimerRegistro, fecha) => {
    const inicio = new Date(`${fechaPrimerRegistro}T00:00:00`);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 13);
    const fechaRegistro = new Date(`${fecha}T00:00:00`);

    return !Number.isNaN(inicio.getTime()) && !Number.isNaN(fechaRegistro.getTime()) && fechaRegistro >= inicio && fechaRegistro <= fin;
};

export const evaluarRiesgoPerdidaTemprana = (curso, registros) => {
    const minutosSemana = calcularMinutosSesion(curso.horaInicio, curso.horaFin)
        + calcularMinutosSesion(curso.horaInicio2, curso.horaFin2);
    const totalClasesPeriodo = Math.round(minutosSemana / MINUTOS_HORA_ACADEMICA) * SEMANAS_PERIODO;
    const umbralPerdida = Math.ceil(totalClasesPeriodo * 0.2);
    const resumen = registros.reduce((total, registro) => {
        const estado = registro.status || (registro.present ? 'Presente' : 'Ausente');
        const unidades = unidadesRegistro(curso, registro.date);
        if (estado === 'Presente') total.unidadesPresentes += unidades;
        if (estado === 'Ausente') total.unidadesAusentes += unidades;
        return total;
    }, { unidadesPresentes: 0, unidadesAusentes: 0 });

    const unidadesRegistradas = resumen.unidadesPresentes + resumen.unidadesAusentes;
    const porcentajeAsistencia = unidadesRegistradas > 0
        ? Math.round((resumen.unidadesPresentes / unidadesRegistradas) * 100)
        : 100;

    return {
        unidadesAusentes: resumen.unidadesAusentes,
        umbralPerdida,
        porcentajeAsistencia,
        enRiesgo: porcentajeAsistencia <= 80 || (umbralPerdida > 0 && resumen.unidadesAusentes >= umbralPerdida),
    };
};