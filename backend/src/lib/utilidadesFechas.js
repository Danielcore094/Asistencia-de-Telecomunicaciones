
export const formatearFechaBogota = (d = new Date()) => {
    const date = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
};

export const obtenerLunesSemana = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
};

const sumarDiasAFechaStr = (dateStr, dias) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d + dias);
    const yr = fecha.getFullYear();
    const mo = String(fecha.getMonth() + 1).padStart(2, '0');
    const dy = String(fecha.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
};

export const obtenerRangoSemanaActual = (referenceDate = new Date()) => {
    const hoyStr = formatearFechaBogota(referenceDate);
    const lunesStr = obtenerLunesSemana(hoyStr);

    return {
        weekStart: lunesStr,
        weekEnd: sumarDiasAFechaStr(lunesStr, 5),
    };
};

export const obtenerRangoSemanaAnterior = (referenceDate = new Date()) => {
    const hoyStr = formatearFechaBogota(referenceDate);
    const lunesActualStr = obtenerLunesSemana(hoyStr);
    const lunesAnteriorStr = sumarDiasAFechaStr(lunesActualStr, -7);

    return {
        weekStart: lunesAnteriorStr,
        weekEnd: sumarDiasAFechaStr(lunesAnteriorStr, 5),
    };
};
