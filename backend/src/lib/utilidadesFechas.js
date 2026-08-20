
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

export const obtenerRangoSemanaActual = (referenceDate = new Date()) => {
    const hoyStr = formatearFechaBogota(referenceDate);
    const lunesStr = obtenerLunesSemana(hoyStr);
    
    const [y, m, d] = lunesStr.split('-').map(Number);
    const lunes = new Date(y, m - 1, d);
    
    const sabado = new Date(lunes);
    sabado.setDate(lunes.getDate() + 5);
    
    return {
        weekStart: lunesStr,
        weekEnd: formatearFechaBogota(sabado)
    };
};

export const obtenerRangoSemanaAnterior = (referenceDate = new Date()) => {
    const hoyStr = formatearFechaBogota(referenceDate);
    const lunesActualStr = obtenerLunesSemana(hoyStr);

    const [y, m, d] = lunesActualStr.split('-').map(Number);
    const lunesActual = new Date(y, m - 1, d);

    const lunesAnterior = new Date(lunesActual);
    lunesAnterior.setDate(lunesActual.getDate() - 7);

    const sabadoAnterior = new Date(lunesAnterior);
    sabadoAnterior.setDate(lunesAnterior.getDate() + 5);

    return {
        weekStart: formatearFechaBogota(lunesAnterior),
        weekEnd:   formatearFechaBogota(sabadoAnterior),
    };
};
