
export const formatearFechaBogota = (d = new Date()) => {
    const date = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
};

const crearFechaUtc = (year, month, day) => new Date(Date.UTC(year, month - 1, day));
const formatearFechaUtc = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const obtenerLunesSemana = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = crearFechaUtc(year, month, day);
    const dow = d.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setUTCDate(d.getUTCDate() + diff);

    return formatearFechaUtc(d);
};

export const obtenerRangoSemanaActual = (referenceDate = new Date()) => {
    const hoyStr = formatearFechaBogota(referenceDate);
    const lunesStr = obtenerLunesSemana(hoyStr);
    
    const [y, m, d] = lunesStr.split('-').map(Number);
    const lunes = crearFechaUtc(y, m, d);

    const sabado = new Date(lunes);
    sabado.setUTCDate(lunes.getUTCDate() + 5);

    return {
        weekStart: lunesStr,
        weekEnd: formatearFechaUtc(sabado)
    };
};

export const obtenerRangoSemanaAnterior = (referenceDate = new Date()) => {
    const hoyStr = formatearFechaBogota(referenceDate);
    const lunesActualStr = obtenerLunesSemana(hoyStr);

    const [y, m, d] = lunesActualStr.split('-').map(Number);
    const lunesActual = crearFechaUtc(y, m, d);

    const lunesAnterior = new Date(lunesActual);
    lunesAnterior.setUTCDate(lunesActual.getUTCDate() - 7);

    const sabadoAnterior = new Date(lunesAnterior);
    sabadoAnterior.setUTCDate(lunesAnterior.getUTCDate() + 5);

    return {
        weekStart: formatearFechaUtc(lunesAnterior),
        weekEnd:   formatearFechaUtc(sabadoAnterior),
    };
};
