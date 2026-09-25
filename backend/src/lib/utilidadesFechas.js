
export const formatearFechaBogota = (d = new Date()) => {
    const date = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
};

export const obtenerPeriodoAcademicoActual = (referenceDate = new Date()) => {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(referenceDate);
    const anio = partes.find(({ type }) => type === 'year')?.value;
    const mes = Number(partes.find(({ type }) => type === 'month')?.value);

    return { anio, periodo: mes <= 6 ? '1' : '2' };
};

export const crearFechaUtc = (year, month, day) => new Date(Date.UTC(year, month - 1, day));

export const parseFechaUtc = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return crearFechaUtc(y, m, d);
};
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

export const obtenerSemanaAcademica = ({ referenceDate = new Date(), weekStart } = {}) => {
    const { anio, periodo } = obtenerPeriodoAcademicoActual(referenceDate);
    const inicioPeriodo = `${anio}-${periodo === '1' ? '01' : '07'}-01`;
    const lunesInicioPeriodo = parseFechaUtc(obtenerLunesSemana(inicioPeriodo));
    const lunesSemana = parseFechaUtc(weekStart || obtenerLunesSemana(formatearFechaBogota(referenceDate)));
    const diferenciaDias = Math.round((lunesSemana - lunesInicioPeriodo) / 86400000);

    return Math.floor(diferenciaDias / 7) + 1;
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
