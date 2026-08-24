import prisma from './prisma.js';
import { formatearFechaBogota, obtenerRangoSemanaActual, obtenerRangoSemanaAnterior, obtenerLunesSemana, parseFechaUtc } from './utilidadesFechas.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');

export async function obtenerInasistenciasSemanales({ referenceDate } = {}) {
    const { weekStart, weekEnd } = obtenerRangoSemanaActual(referenceDate);

    console.log(`[servicioAsistencia] Consultando inasistencias del ${weekStart} al ${weekEnd}`);

    const dates = [];
    const start = parseFechaUtc(weekStart);
    const end   = parseFechaUtc(weekEnd);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
    }

    const absences = await prisma.asistencia.findMany({
        where: {
            present: false,
            date: { in: dates },
        },
        include: {
            student: { select: { documento: true, name: true, email: true } },
            course:  { select: { name: true } },
        },
        orderBy: { date: 'asc' },
    });

    const grouped = new Map();
    for (const record of absences) {
        const { student, course } = record;
        if (!grouped.has(student.documento)) {
            grouped.set(student.documento, {
                studentId:     student.documento,
                studentName:   student.name,
                email:         student.email,
                totalAbsences: 0,
                courses:       new Set(),
                weekStart,
                weekEnd,
            });
        }
        const entry = grouped.get(student.documento);
        entry.totalAbsences++;
        entry.courses.add(course.name);
    }

    const result = Array.from(grouped.values()).map(entry => ({
        ...entry,
        courses: Array.from(entry.courses),
    }));

    console.log(`[servicioAsistencia] Estudiantes con inasistencias: ${result.length}`);
    return result;
}


function formatearNombre(nombre) {
    if (!nombre) return '';
    return nombre.toLowerCase().split(' ')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function compararPorApellido(a, b) {
    const apellido = (n) => {
        const palabras = (n || '').trim().split(/\s+/);
        return (palabras.length > 2
            ? palabras.slice(-2).join(' ')
            : palabras[palabras.length - 1] || '').toLowerCase();
    };
    return apellido(a).localeCompare(apellido(b), 'es');
}

function formatearFechaCabecera(fecha) {
    const [y, m, d] = fecha.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function crearEstilos() {
    const border = {
        top:    { style: 'thin', color: { rgb: 'E2E6EF' } },
        bottom: { style: 'thin', color: { rgb: 'E2E6EF' } },
        left:   { style: 'thin', color: { rgb: 'E2E6EF' } },
        right:  { style: 'thin', color: { rgb: 'E2E6EF' } },
    };
    const baseFont = { name: 'Arial', sz: 10 };
    const fillAlt = { fill: { fgColor: { rgb: 'F4F4F5' } } };
    return {
        sTitulo:      { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sSubtitulo:   { fill: { fgColor: { rgb: 'E7EDE0' } }, font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '5A6B35' } }, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sSeccion:     { fill: { fgColor: { rgb: 'E7EDE0' } }, font: { ...baseFont, bold: true, color: { rgb: '4C3A6B' } }, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sLabel:       { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { ...baseFont, bold: true, color: { rgb: '4C3A6B' } }, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sPerfil:      { fill: { fgColor: { rgb: 'F4F4F5' } }, font: baseFont, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sValor:       { font: baseFont, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sEnc:         { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { ...baseFont, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sEncLeft:     { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { ...baseFont, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sNormal:      { font: baseFont, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sNormalAlt:   { ...fillAlt, font: baseFont, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sCentrado:    { font: baseFont, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sCentradoAlt: { ...fillAlt, font: baseFont, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sNota:        { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '4B5563' } }, alignment: { horizontal: 'left', vertical: 'center' }, border },
        sP:           { fill: { fgColor: { rgb: 'F2F9E7' } }, font: { ...baseFont, bold: true, color: { rgb: '8DC63F' } }, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sA:           { fill: { fgColor: { rgb: 'FEF2F2' } }, font: { ...baseFont, bold: true, color: { rgb: 'DC2626' } }, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sJ:           { fill: { fgColor: { rgb: 'E7EDE0' } }, font: { ...baseFont, bold: true, color: { rgb: '466935' } }, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sSin:         { font: baseFont, alignment: { horizontal: 'center', vertical: 'center' }, border },
        sSinAlt:      { ...fillAlt, font: baseFont, alignment: { horizontal: 'center', vertical: 'center' }, border },
    };
}

async function generarExcelDocente({ teacherId, weekStart, weekEnd, dates }) {
    const fechasCab = dates.map(formatearFechaCabecera);
    const estilos   = crearEstilos();

    const courses = await prisma.curso.findMany({
        where: teacherId ? { teacherId } : {},
        orderBy: [{ name: 'asc' }, { groupCode: 'asc' }],
        include: { teacher: { select: { name: true, email: true } } },
    });

    if (courses.length === 0) return null;

    const wb = XLSX.utils.book_new();
    const nombresUsados = new Set();
    let hojasScritas = 0;

    for (const curso of courses) {
        const estudiantesRaw = await prisma.estudiante.findMany({
            where: { attendances: { some: { courseId: curso.id } } },
            select: {
                documento: true,
                name:      true,
                email:     true,
                correo2:   true,
                whatsapp:  true,
                telefono2: true,
            },
        });

        if (estudiantesRaw.length === 0) continue;

        const estudiantes = [...estudiantesRaw].sort((a, b) =>
            compararPorApellido(a.name, b.name)
        );

        const asistencias = await prisma.asistencia.findMany({
            where: { courseId: curso.id, date: { in: dates } },
            select: { studentId: true, date: true, present: true, status: true },
        });

        const mapa = {};
        for (const reg of asistencias) {
            if (!mapa[reg.studentId]) mapa[reg.studentId] = {};
            mapa[reg.studentId][reg.date] = reg;
        }

        const ws       = {};
        const rowsMeta = [];
        let r = 0;

        const addCell = (row, col, val, sty) => {
            ws[XLSX.utils.encode_cell({ r: row, c: col })] = {
                v: val ?? '',
                t: typeof val === 'number' ? 'n' : 's',
                s: sty,
            };
        };

        const reportTitle = `Reporte de Asistencia - ${curso.name || 'Materia'} ${curso.groupCode ? `(${curso.groupCode})` : ''}`.trim();
        const reportSubtitle = `Semana del ${fechasCab[0]} al ${fechasCab[5]}`;
        const reportOrg = 'UTS - Sistema de Asistencia de Telecomunicaciones';
        const generatedAt = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        ];

        addCell(r, 0, reportTitle, estilos.sTitulo);
        for (let c = 1; c < 8; c++) addCell(r, c, '', estilos.sTitulo);
        rowsMeta.push({ hpt: 26 });
        r++;

        addCell(r, 0, reportSubtitle, estilos.sSubtitulo);
        for (let c = 1; c < 8; c++) addCell(r, c, '', estilos.sSubtitulo);
        rowsMeta.push({ hpt: 20 });
        r++;

        addCell(r, 0, reportOrg, estilos.sLabel);
        for (let c = 1; c < 8; c++) addCell(r, c, '', estilos.sLabel);
        rowsMeta.push({ hpt: 18 });
        r++;

        const perfil = [
            ['Docente:',  curso.teacher?.name || ''],
            ['Correo:',   curso.teacher?.email || ''],
            ['Materia:',  curso.name || ''],
            ['Código:',   curso.code || ''],
            ['Grupo:',    curso.groupCode || ''],
            ['Período:',  curso.academicPeriod || ''],
            ['Año:',      curso.academicYear || ''],
            ['Semana:',   reportSubtitle],
        ];
        for (const [lbl, val] of perfil) {
            addCell(r, 0, lbl, estilos.sLabel);
            addCell(r, 1, val, estilos.sPerfil);
            rowsMeta.push({ hpt: 20 }); r++;
        }
        rowsMeta.push({ hpt: 8 }); r++;

        ['Documento', 'Nombre del Alumno', ...fechasCab].forEach((t, c) =>
            addCell(r, c, t, estilos.sEnc)
        );
        rowsMeta.push({ hpt: 28 }); r++;

        let filaAsistencia = 0;
        for (const est of estudiantes) {
            const rowStyle = filaAsistencia % 2 === 0 ? estilos.sNormal : estilos.sNormalAlt;
            const centerStyle = filaAsistencia % 2 === 0 ? estilos.sCentrado : estilos.sCentradoAlt;
            addCell(r, 0, est.documento,             centerStyle);
            addCell(r, 1, formatearNombre(est.name), rowStyle);
            dates.forEach((fecha, c) => {
                const reg = mapa[est.documento]?.[fecha];
                let v = '–', s = filaAsistencia % 2 === 0 ? estilos.sSin : estilos.sSinAlt;
                if (reg) {
                    const estado = reg.status || (reg.present ? 'Presente' : 'Ausente');
                    if (estado === 'Presente')    { v = 'P'; s = estilos.sP; }
                    else if (estado === 'Ausente')     { v = 'A'; s = estilos.sA; }
                    else if (estado === 'Justificado') { v = 'J'; s = estilos.sJ; }
                }
                addCell(r, 2 + c, v, s);
            });
            rowsMeta.push({ hpt: 20 }); r++;
            filaAsistencia++;
        }

        rowsMeta.push({ hpt: 8 }); r++;

        addCell(r, 0, 'Directorio de contacto', estilos.sSeccion);
        for (let c = 1; c < 8; c++) addCell(r, c, '', estilos.sSeccion);
        merges.push({ s: { r, c: 0 }, e: { r, c: 7 } });
        rowsMeta.push({ hpt: 24 }); r++;

        ['Documento', 'Nombre del Alumno', 'Correo Institucional', 'Correo Adicional', 'Número WhatsApp', 'Número Adicional']
            .forEach((t, c) => addCell(r, c, t, estilos.sEncLeft));
        const directoryHeaderRow = r;
        rowsMeta.push({ hpt: 28 }); r++;

        let filaDirectorio = 0;
        for (const est of estudiantes) {
            const rowStyle = filaDirectorio % 2 === 0 ? estilos.sNormal : estilos.sNormalAlt;
            const centerStyle = filaDirectorio % 2 === 0 ? estilos.sCentrado : estilos.sCentradoAlt;
            addCell(r, 0, est.documento,             centerStyle);
            addCell(r, 1, formatearNombre(est.name), rowStyle);
            addCell(r, 2, est.email     || '',       rowStyle);
            addCell(r, 3, est.correo2   || '',       rowStyle);
            addCell(r, 4, est.whatsapp  || '',       rowStyle);
            addCell(r, 5, est.telefono2 || '',       rowStyle);
            rowsMeta.push({ hpt: 20 }); r++;
            filaDirectorio++;
        }

        rowsMeta.push({ hpt: 18 });
        addCell(r, 0, `Informe generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`, estilos.sNota);
        for (let c = 1; c < 8; c++) addCell(r, c, '', estilos.sNota);
        merges.push({ s: { r, c: 0 }, e: { r, c: 7 } });
        r++;

        ws['!merges'] = merges;
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: directoryHeaderRow, c: 0 }, e: { r: directoryHeaderRow, c: 5 } }) };
        ws['!freeze'] = { xSplit: 0, ySplit: 8 };
        ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 7 } });
        ws['!rows'] = rowsMeta;
        ws['!cols'] = [
            { wch: 16 }, { wch: 34 },
            { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
            { wch: 14 }, { wch: 14 },
        ];

        const base = (curso.name || 'Materia').replace(/[\\/?*[\]:]/g, '').trim();
        const suf  = curso.groupCode ? ` (${curso.groupCode})` : '';
        let nombreHoja = (base + suf).substring(0, 31);
        let sufIdx = 1;
        while (nombresUsados.has(nombreHoja)) {
            const extra = `-${sufIdx++}`;
            nombreHoja  = (base + suf).substring(0, 31 - extra.length) + extra;
        }
        nombresUsados.add(nombreHoja);

        XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
        hojasScritas++;
    }

    if (hojasScritas === 0) return null;

    return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

async function obtenerResumenAsistenciaSemanal({ teacherId, dates }) {
    const where = { date: { in: dates } };
    if (teacherId) where.course = { teacherId };

    const registros = await prisma.asistencia.findMany({
        where,
        select: { studentId: true, present: true, status: true, student: { select: { name: true } } },
    });
    const estudiantesAusentes = new Map();
    let ausencias = 0;
    for (const registro of registros) {
        const estado = registro.status || (registro.present ? 'Presente' : 'Ausente');
        if (estado !== 'Presente' && estado !== 'Justificado') {
            ausencias++;
            estudiantesAusentes.set(registro.studentId, registro.student?.name || registro.studentId);
        }
    }
    return {
        totalRecords: registros.length,
        absentRecords: ausencias,
        absentStudents: estudiantesAusentes.size,
        absencePercentage: registros.length > 0 ? Math.round((ausencias / registros.length) * 100) : 0,
        absentStudentNames: [...estudiantesAusentes.values()],
    };
}

export async function crearReporteExcelSemanalGeneral({ referenceDate } = {}) {
    const { weekStart, weekEnd } = obtenerRangoSemanaActual(referenceDate);
    const dates = [];
    const start = parseFechaUtc(weekStart);
    const end = parseFechaUtc(weekEnd);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
    }

    const buffer = await generarExcelDocente({ weekStart, weekEnd, dates });
    if (!buffer) return null;

    const courseCount = await prisma.curso.count({ where: { attendances: { some: {} } } });
    return {
        buffer,
        weekStart,
        weekEnd,
        courseCount,
        ...(await obtenerResumenAsistenciaSemanal({ dates })),
    };
}

export async function crearReportesSemanalesPorDocente({ referenceDate, semanaActual = false } = {}) {
    const { weekStart, weekEnd } = semanaActual
        ? obtenerRangoSemanaActual(referenceDate)
        : obtenerRangoSemanaAnterior(referenceDate);

    console.log(`[servicioAsistencia] Generando reportes por docente: ${weekStart} → ${weekEnd}`);

    const dates = [];
    const start = parseFechaUtc(weekStart);
    const end   = parseFechaUtc(weekEnd);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
    }

    const teachers = await prisma.docente.findMany({
        where: { courses: { some: {} } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
    });

    const reportes = [];

    for (const teacher of teachers) {
        const buffer = await generarExcelDocente({
            teacherId: teacher.id,
            weekStart,
            weekEnd,
            dates,
        });

        if (!buffer) {
            console.log(`[servicioAsistencia] Sin cursos con estudiantes para: ${teacher.name}`);
            continue;
        }

        const courseCount = await prisma.curso.count({ where: { teacherId: teacher.id } });
        const resumen = await obtenerResumenAsistenciaSemanal({ teacherId: teacher.id, dates });

        reportes.push({
            teacherName: teacher.name,
            teacherEmail: teacher.email,
            buffer,
            weekStart,
            weekEnd,
            courseCount,
            ...resumen,
        });

        console.log(`[servicioAsistencia] Reporte generado: ${teacher.name} (${courseCount} materias)`);
    }

    return reportes;
}

export async function crearReporteSemanalPorDocente({ teacherId, referenceDate } = {}) {
    if (!teacherId) return null;
    const { weekStart, weekEnd } = obtenerRangoSemanaAnterior(referenceDate);

    const teacher = await prisma.docente.findUnique({
        where: { id: teacherId },
        select: { id: true, name: true, email: true },
    });
    if (!teacher) return null;

    const dates = [];
    const [sy, sm, sd] = weekStart.split('-').map(Number);
    const [ey, em, ed] = weekEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(formatearFechaBogota(d));
    }

    const buffer = await generarExcelDocente({
        teacherId,
        weekStart,
        weekEnd,
        dates,
    });
    if (!buffer) return null;

    const courseCount = await prisma.curso.count({ where: { teacherId } });
    const resumen = await obtenerResumenAsistenciaSemanal({ teacherId, dates });
    return {
        teacherName: teacher.name,
        teacherEmail: teacher.email,
        buffer,
        weekStart,
        weekEnd,
        courseCount,
        ...resumen,
    };
}

export async function crearReporteExcelSemanalCurso({ referenceDate } = {}) {
    const reportes = await crearReportesSemanalesPorDocente({ referenceDate });
    if (reportes.length === 0) return { buffer: Buffer.alloc(0), weekStart: '', weekEnd: '', courseCount: 0, totalRecords: 0 };
    const r = reportes[0];
    return { buffer: r.buffer, weekStart: r.weekStart, weekEnd: r.weekEnd, courseCount: r.courseCount, totalRecords: 0 };
}

export async function crearExcelResumenSemestral({ anio, periodo, docenteId } = {}) {
    const filtroCurso = {};
    if (anio)      filtroCurso.academicYear   = anio;
    if (periodo)   filtroCurso.academicPeriod = periodo;
    if (docenteId) filtroCurso.teacherId      = docenteId;

    const courses = await prisma.curso.findMany({
        where: filtroCurso,
        orderBy: [{ name: 'asc' }, { groupCode: 'asc' }],
        include: {
            teacher:  { select: { name: true } },
            matriculas: { select: { estudianteId: true } },
        },
    });

    if (courses.length === 0) return null;

    const courseIds = courses.map(c => c.id);

    const todasAsistencias = await prisma.asistencia.findMany({
        where: { courseId: { in: courseIds } },
        select: { courseId: true, studentId: true, date: true, present: true },
    });

    const lunesSet = new Set();
    for (const a of todasAsistencias) lunesSet.add(obtenerLunesSemana(a.date));
    const semanas = [...lunesSet].sort();
    const numSemanas = semanas.length;
    const semanaLabel = (i) => String(i + 1).padStart(2, '0');

    const presentesPorCursoSemana = {};
    const asistenciasPorCursoEstudiante = {};
    for (const a of todasAsistencias) {
        if (!presentesPorCursoSemana[a.courseId]) presentesPorCursoSemana[a.courseId] = {};
        const lunes = obtenerLunesSemana(a.date);
        if (!presentesPorCursoSemana[a.courseId][lunes]) presentesPorCursoSemana[a.courseId][lunes] = 0;
        if (a.present) presentesPorCursoSemana[a.courseId][lunes]++;

        if (!asistenciasPorCursoEstudiante[a.courseId]) asistenciasPorCursoEstudiante[a.courseId] = {};
        const asistenciasCurso = asistenciasPorCursoEstudiante[a.courseId];
        if (!asistenciasCurso[a.studentId]) asistenciasCurso[a.studentId] = { presentes: 0, total: 0 };
        asistenciasCurso[a.studentId].total++;
        if (a.present) asistenciasCurso[a.studentId].presentes++;
    }

    const border = {
        top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
    };
    const baseFont = { name: 'Arial', sz: 10 };
    const sTitulo  = { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sEncPurp = { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { ...baseFont, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sEncLeft = { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { ...baseFont, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'left', vertical: 'center' }, border };
    const sEncVerde= { fill: { fgColor: { rgb: 'DCE5C6' } }, font: { ...baseFont, bold: true, color: { rgb: '466935' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sNormal  = { font: baseFont, alignment: { horizontal: 'left', vertical: 'center' }, border };
    const sAlt     = { fill: { fgColor: { rgb: 'F4F4F5' } }, font: baseFont, alignment: { horizontal: 'left', vertical: 'center' }, border };
    const sNum     = { font: { ...baseFont, name: 'Courier New' }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sNumAlt  = { fill: { fgColor: { rgb: 'F4F4F5' } }, font: { ...baseFont, name: 'Courier New' }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sTotal   = { fill: { fgColor: { rgb: 'E5E9EE' } }, font: { ...baseFont, bold: true, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sAprobado= { fill: { fgColor: { rgb: 'E7EDE0' } }, font: { ...baseFont, bold: true, color: { rgb: '3D7A00' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const sNota    = { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '6B7280' } }, alignment: { horizontal: 'left', vertical: 'center' } };

    const ws  = {};
    const addC = (r, c, v, s) => {
        ws[XLSX.utils.encode_cell({ r, c })] = { v: v ?? '', t: typeof v === 'number' ? 'n' : 's', s };
    };
    const merges = [];
    const rowsMeta = [];
    const numCols = 5 + numSemanas + 1;
    const lastCol  = numCols - 1;

    let r = 0;

    const anioPeriodo = (anio && periodo) ? `${anio}-${periodo}` : (anio || periodo || new Date().getFullYear());
    addC(r, 0, `Reporte de Asistencia ${anioPeriodo} — UTS Telecomunicaciones`, sTitulo);
    for (let c = 1; c <= lastCol; c++) addC(r, c, '', sTitulo);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } });
    rowsMeta.push({ hpt: 26 }); r++;

    addC(r, 0, 'CODIGO',   sEncLeft);
    addC(r, 1, 'DOCENTE',  sEncLeft);
    addC(r, 2, 'MATERIA',  sEncLeft);
    addC(r, 3, 'GRUPO',    sEncPurp);
    addC(r, 4, 'MATRI.',   sEncPurp);
    addC(r, 5, 'SEMANA',   sEncVerde);
    for (let c = 6; c < 5 + numSemanas; c++) addC(r, c, '', sEncVerde);
    addC(r, lastCol, 'APROBARON', sEncPurp);
    if (numSemanas > 1) merges.push({ s: { r: 1, c: 5 }, e: { r: 1, c: 5 + numSemanas - 1 } });
    rowsMeta.push({ hpt: 24 }); r++;

    addC(r, 0, '', sEncLeft); addC(r, 1, '', sEncLeft); addC(r, 2, '', sEncLeft);
    addC(r, 3, '', sEncPurp); addC(r, 4, '', sEncPurp);
    semanas.forEach((_, i) => addC(r, 5 + i, semanaLabel(i), sEncVerde));
    addC(r, lastCol, '', sEncPurp);
    rowsMeta.push({ hpt: 20 }); r++;

    const totalesSemana = new Array(numSemanas).fill(0);
    const totalesMatri  = { total: 0 };
    const totalesAprobaron = { total: 0 };

    courses.forEach((curso, idx) => {
        const sRow = idx % 2 === 0 ? sNormal : sAlt;
        const sN   = idx % 2 === 0 ? sNum    : sNumAlt;
        const matriculados = curso.matriculas.length;
        totalesMatri.total += matriculados;

        const asistenciasPorEstudiante = asistenciasPorCursoEstudiante[curso.id] ?? {};
        const aprobaron = Object.values(asistenciasPorEstudiante).filter(
            ({ presentes, total }) => total > 0 && (presentes / total) >= 0.7
        ).length;
        totalesAprobaron.total += aprobaron;

        addC(r, 0, curso.code,                     sRow);
        addC(r, 1, formatearNombre(curso.teacher?.name || ''), sRow);
        addC(r, 2, curso.name,                     sRow);
        addC(r, 3, curso.groupCode,                sN);
        addC(r, 4, matriculados,                   sN);
        semanas.forEach((lunes, i) => {
            const cnt = presentesPorCursoSemana[curso.id]?.[lunes] ?? 0;
            totalesSemana[i] += cnt;
            addC(r, 5 + i, cnt > 0 ? cnt : '', sN);
        });
        addC(r, lastCol, aprobaron > 0 ? aprobaron : '', sAprobado);
        rowsMeta.push({ hpt: 20 }); r++;
    });

    addC(r, 0, 'TOTALES', sTotal);
    for (let c = 1; c <= 4; c++) addC(r, c, '', sTotal);
    semanas.forEach((_, i) => addC(r, 5 + i, totalesSemana[i], sTotal));
    addC(r, lastCol, totalesAprobaron.total, sTotal);
    rowsMeta.push({ hpt: 22 }); r++;

    const sPct = { fill: { fgColor: { rgb: 'F0F2F5' } }, font: { name: 'Courier New', sz: 9, color: { rgb: '2F3A45' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    addC(r, 0, '% asistencia', sPct);
    for (let c = 1; c <= 4; c++) addC(r, c, '', sPct);
    semanas.forEach((_, i) => {
        const pct = totalesMatri.total > 0
            ? `${Math.round((totalesSemana[i] / totalesMatri.total) * 100)}%`
            : '';
        addC(r, 5 + i, pct, sPct);
    });
    addC(r, lastCol, '', sPct);
    rowsMeta.push({ hpt: 18 }); r++;

    addC(r, 0, `Informe generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`, sNota);
    merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } });
    rowsMeta.push({ hpt: 16 }); r++;

    ws['!ref']    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: lastCol } });
    ws['!merges'] = merges;
    ws['!rows']   = rowsMeta;
    ws['!freeze'] = { xSplit: 5, ySplit: 3 };
    const colWidths = [
        { wch: 14 },
        { wch: 30 },
        { wch: 36 },
        { wch: 10 },
        { wch: 9  },
        ...semanas.map(() => ({ wch: 7 })),
        { wch: 12 },
    ];
    ws['!cols'] = colWidths;
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }) };

    const wsEsp  = {};
    const addE   = (row, col, val, sty) => {
        wsEsp[XLSX.utils.encode_cell({ r: row, c: col })] = { v: val ?? '', t: 's', s: sty };
    };
    const mergesEsp = [];

    const programa = courses[0]?.matriculas?.[0]
        ? (await prisma.estudiante.findFirst({ where: { documento: courses[0].matriculas[0].estudianteId }, select: { programa: true } }))?.programa || ''
        : '';

    addE(0, 0, programa || 'PROGRAMA ACADÉMICO', sTitulo);
    for (let c = 1; c < 8; c++) addE(0, c, '', sTitulo);
    mergesEsp.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

    const subtituloEsp = `REGISTRO DE ESTUDIANTES CON CONDICIONES ESPECIALES - PERIODO ACADÉMICO ${anioPeriodo}`;
    addE(1, 0, subtituloEsp, sTitulo);
    for (let c = 1; c < 8; c++) addE(1, c, '', sTitulo);
    mergesEsp.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
    addE(2, 0, '', sNormal);

    const headersEsp = ['DOCUMENTO', 'NOMBRE', 'CORREO', 'TELEFONOS', 'ASIGNATURA', 'SEMESTRE', 'DOCENTE QUIEN REPORTA', 'OBSERVACIONES'];
    headersEsp.forEach((h, c) => addE(3, c, h, sEncLeft));

    let resp = 4;
    const estudiantesEnRiesgo = await prisma.estudiante.findMany({
        where: { attendances: { some: { courseId: { in: courseIds } } } },
        select: {
            documento: true, name: true, email: true, whatsapp: true, telefono2: true, programa: true,
            attendances: {
                where: { courseId: { in: courseIds } },
                select: { courseId: true, present: true, course: { select: { name: true, groupCode: true, academicPeriod: true, teacher: { select: { name: true } } } } },
            },
        },
    });

    for (const est of estudiantesEnRiesgo) {
        const porCurso = {};
        for (const a of est.attendances) {
            if (!porCurso[a.courseId]) porCurso[a.courseId] = { presentes: 0, total: 0, course: a.course };
            porCurso[a.courseId].total++;
            if (a.present) porCurso[a.courseId].presentes++;
        }
        for (const { presentes, total, course } of Object.values(porCurso)) {
            if (total > 0 && (presentes / total) < 0.6) {
                const pct = Math.round((presentes / total) * 100);
                addE(resp, 0, est.documento,                               resp % 2 === 0 ? sNormal : sAlt);
                addE(resp, 1, formatearNombre(est.name),                   resp % 2 === 0 ? sNormal : sAlt);
                addE(resp, 2, est.email || '',                             resp % 2 === 0 ? sNormal : sAlt);
                addE(resp, 3, est.whatsapp || est.telefono2 || '',         resp % 2 === 0 ? sNormal : sAlt);
                addE(resp, 4, course.name,                                 resp % 2 === 0 ? sNormal : sAlt);
                addE(resp, 5, course.academicPeriod || '',                 resp % 2 === 0 ? sNum    : sNumAlt);
                addE(resp, 6, formatearNombre(course.teacher?.name || ''), resp % 2 === 0 ? sNormal : sAlt);
                addE(resp, 7, `Asistencia: ${pct}%`,                      resp % 2 === 0 ? sNormal : sAlt);
                resp++;
            }
        }
    }

    wsEsp['!ref']    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(resp - 1, 4), c: 7 } });
    wsEsp['!merges'] = mergesEsp;
    wsEsp['!cols']   = [{ wch: 14 }, { wch: 30 }, { wch: 32 }, { wch: 16 }, { wch: 34 }, { wch: 10 }, { wch: 28 }, { wch: 22 }];
    wsEsp['!rows']   = [{ hpt: 26 }, { hpt: 22 }, { hpt: 10 }, { hpt: 24 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,    'Asistencia');
    XLSX.utils.book_append_sheet(wb, wsEsp, 'Estudiantes Especiales');

    return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
