import { useState, useEffect, useMemo } from 'react';
import api, { obtenerReportes, obtenerReportesSemanal, obtenerDocentes, obtenerDataExportacion, obtenerAsistencia, obtenerEstudiantes, descargarResumenSemestral } from '../services/api';
import { Download, TrendingUp, LayoutGrid, PieChart as PieIcon, Users, Loader2 } from 'lucide-react';
import * as xlsx from 'xlsx-js-style';
import toast from 'react-hot-toast';
import { useCurso } from '../context/ContextoCurso';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import FiltrosGlobales from '../components/FiltrosGlobales';
import { formatearNombre, compararPorApellido } from '../utils/formatearNombre';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
    AreaChart, Area
} from 'recharts';


function v(variable) {
    if (typeof window === 'undefined') return '#000';
    return getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
}



const getColoresLineas = () => [
    v('--color-primary'),
    v('--color-accent'),
    v('--color-primary-dark'),
    v('--color-accent-dark'),
    v('--color-text-secondary'),
    v('--color-muted'),
];

const MODOS_GRUPO = [
    { id: 'materia', label: 'Por materia' },
    { id: 'periodo', label: 'Por período académico' },
    { id: 'modalidad', label: 'Por modalidad (Tec/Ing)' },
    { id: 'docente', label: 'Por docente' },
    { id: 'docentes_ti', label: 'Docentes Tec/Ing' },
];


function mergeSemanales(series) {
    const mapa = {};
    series.forEach(({ nombre, semanas = [] }) => {
        semanas.forEach(({ semana, presente }) => {
            if (!mapa[semana]) mapa[semana] = { semana };
            mapa[semana][nombre] = presente;
        });
    });
    return Object.values(mapa).sort((a, b) => {
        const n = (s) => parseInt(s.semana.replace('Semana ', ''), 10);
        return n(a) - n(b);
    });
}



function TooltipSemanal({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--card-radius)', padding: '10px 14px', fontSize: '0.8125rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
            <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
}

const getColoresBrackets = () => [
    v('--color-accent'),
    v('--color-accent-dark'),
    v('--color-primary'),
    v('--color-primary-dark'),
];

const ETIQUETAS_BRACKETS = ['90% o más', '80 - 89%', '70 - 79%', 'Menos de 70%'];

const etiquetaTorta = ({ name, percent }) => `${name} · ${Math.round(percent * 100)}%`;



const obtenerRangoFecha = (rango) => {
    const hoy = new Date();
    const formato = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    switch (rango) {
        case 'hoy':
            return { inicio: formato(hoy), fin: formato(hoy) };
        case 'esta_semana': {
            const inicio = new Date(hoy);
            const dia = inicio.getDay() || 7;
            inicio.setDate(inicio.getDate() - dia + 1);
            const fin = new Date(inicio);
            fin.setDate(fin.getDate() + 6);
            return { inicio: formato(inicio), fin: formato(fin) };
        }
        case 'semana_pasada': {
            const inicio = new Date(hoy);
            const dia = inicio.getDay() || 7;
            inicio.setDate(inicio.getDate() - dia - 6);
            const fin = new Date(inicio);
            fin.setDate(fin.getDate() + 6);
            return { inicio: formato(inicio), fin: formato(fin) };
        }
        case 'este_mes': {
            const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
            return { inicio: formato(inicio), fin: formato(fin) };
        }
        case 'ultimos_3_meses': {
            const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
            const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
            return { inicio: formato(inicio), fin: formato(fin) };
        }
        default:
            return null;
    }
};




function TooltipBarra({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const { porcentaje, presentes, ausentes, justificados, clases } = payload[0].payload;
    return (
        <div
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--card-radius)',
                padding: '10px 14px',
                fontSize: '0.8125rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
        >
            <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{label}</p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
                Asistencia: <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{porcentaje}%</span>
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
                Presentes: <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{presentes}</span>
                {' ┬À '}
                Ausentes: <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-absent)' }}>{ausentes}</span>
                {justificados > 0 && <>
                    {' ┬À '}
                    Justificados: <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-excused)' }}>{justificados}</span>
                </>}
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>Total clases: {clases}</p>
        </div>
    );
}



function TooltipTorta({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--card-radius)',
                padding: '8px 14px',
                fontSize: '0.8125rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
        >
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {name}: <span style={{ fontFamily: 'var(--font-mono)' }}>{value} estudiantes</span>
            </p>
        </div>
    );
}

const VISTAS = [
    { id: 'distribucion', label: 'Distribuci\u00f3n', Icono: PieIcon },
    { id: 'tiempo', label: 'Asistencia en el tiempo', Icono: TrendingUp },
    { id: 'tabla', label: 'Detalle por Estudiante', Icono: Users },
];


export default function Reportes() {
    const {
        cursos,
        cursoSeleccionado,
        codigoSeleccionado,
        grupoSeleccionado,
        docenteSeleccionado,
    } = useCurso();
    const { usuario } = useAutenticacion();
    const isAdmin = usuario?.role === 'ADMIN';
    const esDocente = usuario?.role === 'DOCENTE' || usuario?.role === 'TEACHER';

    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [vistaActiva, setVistaActiva] = useState('distribucion');
    const [exportando, setExportando] = useState(false);
    const [rangoSeleccionado, setRangoSeleccionado] = useState('personalizado');




    const manejarCambioRango = (e) => {
        const rango = e.target.value;
        setRangoSeleccionado(rango);

        if (rango === 'personalizado') {
            setFechaInicio('');
            setFechaFin('');
            return;
        }

        const fechas = obtenerRangoFecha(rango);
        if (fechas) {
            setFechaInicio(fechas.inicio);
            setFechaFin(fechas.fin);
        }
    };

    const manejarCambioFechaManual = (setter) => (e) => {
        setter(e.target.value);
        setRangoSeleccionado('personalizado');
    };

    const [modoGrupo, setModoGrupo] = useState('materia');
    const [datosLineChart, setDatosLineChart] = useState([]);
    const [seriesNombres, setSeriesNombres] = useState([]);
    const [datosBarrasSemanales, setDatosBarrasSemanales] = useState([]);
    const [cargandoSemanal, setCargandoSemanal] = useState(false);
    const [docentes, setDocentes] = useState([]);
    const [exportandoSemanal, setExportandoSemanal] = useState(false);
    const [exportandoResumen, setExportandoResumen] = useState(false);

    const filtros = {
        codigo: codigoSeleccionado,
        grupo: grupoSeleccionado,
        docenteId: docenteSeleccionado,
    };

    const cargarReportes = async () => {
        if (!cursoSeleccionado) return;
        setCargando(true);
        try {
            const params = {};
            if (fechaInicio) params.startDate = fechaInicio;
            if (fechaFin) params.endDate = fechaFin;
            const respuesta = await obtenerReportes(cursoSeleccionado.id, params);
            setDatos([...respuesta].sort((a, b) => compararPorApellido(a.name, b.name)));
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (cursoSeleccionado) {
            cargarReportes();
        } else {
            setDatos([]);
            setCargando(false);
        }
    }, [fechaInicio, fechaFin, cursoSeleccionado, codigoSeleccionado, grupoSeleccionado, docenteSeleccionado]);



    useEffect(() => {
        obtenerDocentes().then(setDocentes).catch(() => setDocentes([]));
    }, []);



    useEffect(() => {
        if (!cursoSeleccionado && !usuario?.id) return;
        const tid = usuario?.id || null;
        const fetchSemanal = async () => {
            setCargandoSemanal(true);
            try {
                let series = [];

                if (modoGrupo === 'materia') {
                    const r = await obtenerReportesSemanal({ courseId: cursoSeleccionado?.id });
                    series = [{ nombre: cursoSeleccionado?.name || 'Materia', semanas: r.semanas }];

                } else if (modoGrupo === 'periodo') {
                    const [r1, r2] = await Promise.all([
                        obtenerReportesSemanal({ docenteId: tid, periodo: '1' }),
                        obtenerReportesSemanal({ docenteId: tid, periodo: '2' }),
                    ]);
                    series = [
                        { nombre: 'Período 1', semanas: r1.semanas },
                        { nombre: 'Período 2', semanas: r2.semanas },
                    ];

                } else if (modoGrupo === 'modalidad' || modoGrupo === 'docentes_ti') {
                    const [rT, rI] = await Promise.all([
                        obtenerReportesSemanal({ docenteId: tid, modalidad: 'Tecnología' }),
                        obtenerReportesSemanal({ docenteId: tid, modalidad: 'Ingeniería' }),
                    ]);
                    series = [
                        { nombre: 'Tecnología', semanas: rT.semanas },
                        { nombre: 'Ingeniería', semanas: rI.semanas },
                    ];

                } else if (modoGrupo === 'docente' && docentes.length > 0) {
                    const resultados = await Promise.all(
                        docentes.slice(0, 5).map((d) =>
                            obtenerReportesSemanal({ docenteId: d.id })
                                .then((r) => ({ nombre: d.name.split(' ')[0], semanas: r.semanas }))
                                .catch(() => ({ nombre: d.name.split(' ')[0], semanas: [] }))
                        )
                    );
                    series = resultados;
                }

                setSeriesNombres(series.map((s) => s.nombre));
                setDatosLineChart(mergeSemanales(series));

                const base = modoGrupo === 'materia' && series[0]
                    ? series[0].semanas
                    : (cursoSeleccionado
                        ? (await obtenerReportesSemanal({ courseId: cursoSeleccionado.id })).semanas
                        : []);
                setDatosBarrasSemanales(base);
            } catch (_e) {
                setDatosLineChart([]);
                setDatosBarrasSemanales([]);
            } finally {
                setCargandoSemanal(false);
            }
        };
        fetchSemanal();
    }, [modoGrupo, cursoSeleccionado, docentes, usuario?.id]);



    const promedioAsistencia = useMemo(() =>
        datos.length > 0
            ? Math.round(datos.reduce((a, i) => a + i.percentage, 0) / datos.length)
            : 0,
        [datos]
    );
    const estudiantesEnRiesgo = useMemo(
        () => datos.filter((i) => i.percentage < 80 || i.failedByAbsence).length,
        [datos]
    );
    const totalFallasActuales = useMemo(
        () => datos.reduce((acc, item) => acc + (item.absent ?? 0), 0),
        [datos]
    );
    const tieneUmbralFaltas = useMemo(
        () => datos.some((i) => typeof i.absencesAllowed === 'number'),
        [datos]
    );



    const datosBarras = useMemo(() =>
        [...datos]
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 20)
            .map((item) => ({
                nombre: item.name.split(' ').slice(0, 2).join(' '),
                porcentaje: item.percentage,
                presentes: item.present,
                ausentes: item.absent ?? 0,
                justificados: item.justified ?? 0,
                clases: item.total,
            })),
        [datos]
    );



    const totalesEstados = useMemo(() =>
        datos.reduce(
            (acc, item) => ({
                present: acc.present + (item.present ?? 0),
                absent: acc.absent + (item.absent ?? 0),
                justified: acc.justified + (item.justified ?? 0),
            }),
            { present: 0, absent: 0, justified: 0 }
        ),
        [datos]
    );

    const datosTorta = useMemo(() => {
        const brackets = [0, 0, 0, 0];
        datos.forEach(({ percentage }) => {
            if (percentage >= 90) brackets[0]++;
            else if (percentage >= 80) brackets[1]++;
            else if (percentage >= 70) brackets[2]++;
            else brackets[3]++;
        });
        return ETIQUETAS_BRACKETS
            .map((name, i) => ({ name, value: brackets[i] }))
            .filter((d) => d.value > 0);
    }, [datos]);





    const exportarExcel = async () => {
        setExportando(true);
        try {
            const teacherId = esDocente ? usuario?.id : docenteSeleccionado;
            const exportarBackend = teacherId && (esDocente || usuario?.role === 'ADMIN');

            if (exportarBackend) {
                const params = { teacherId };
                const response = await api.get('/reportes/descargar', {
                    params,
                    responseType: 'blob',
                });

                const contentDisposition = response.headers['content-disposition'] || '';
                const match = /filename="?([^";]+)"?/.exec(contentDisposition);
                const nombreArchivo = match ? match[1] : `reporte-${teacherId}-${new Date().toISOString().split('T')[0]}.xlsx`;
                const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = nombreArchivo;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);

                toast.success('Reporte descargado correctamente');
                return;
            }

            const params = {};
            if (fechaInicio) params.startDate = fechaInicio;
            if (fechaFin) params.endDate = fechaFin;

            const wb = xlsx.utils.book_new();
            const cursosExportar = [];
            let courseCount = 0;
            let totalEstudiantes = 0;

            const normalizarNombreHoja = (nombre, usadas) => {
                const base = (String(nombre || 'Materia'))
                    .replace(/[\\/:*?\[\]]/g, '')
                    .substring(0, 25)
                    .trim() || 'Materia';
                let nombreHoja = base;
                let sufijo = 1;
                while (usadas.has(nombreHoja)) {
                    nombreHoja = `${base}-${sufijo++}`.substring(0, 31);
                }
                usadas.add(nombreHoja);
                return nombreHoja;
            };

            if (!cursoSeleccionado) {
                cursosExportar.push(...(cursos.length > 0 ? cursos : []));
                
                if (cursosExportar.length === 0) {
                    toast.error('No hay materias disponibles para exportar');
                    return;
                }

                const nombresHojasUsadas = new Set();
                const paramsConSuppress = { ...params, suppressAudit: true };
                const resumenGeneral = [];
                courseCount = cursosExportar.length;

                for (const curso of cursosExportar) {
                    if (!curso?.id) {
                        console.warn('Curso sin ID ignorado en exportación', curso);
                        continue;
                    }

                    try {
                        const data = await obtenerDataExportacion(curso.id, paramsConSuppress, filtros, {
                            headers: { 'x-suppress-audit': '1' }
                        });

                        const filasCurso = (data.asignaturas || []).map(a => ({
                            'Documento': a.documento,
                            'Estudiante': a.estudiante,
                            'Clases Totales': a.total,
                            'Presentes': a.present,
                            'Ausentes': a.absent,
                            'Justificados': a.justified,
                            '% Asistencia': `${a.percentage}%`
                        }));

                        if (filasCurso.length > 0) {
                            const ws = xlsx.utils.json_to_sheet(filasCurso);
                            const nombreHoja = normalizarNombreHoja(
                                `${curso.name || 'Materia'}${curso.groupCode ? ` - ${curso.groupCode}` : ''}`,
                                nombresHojasUsadas
                            );
                            xlsx.utils.book_append_sheet(wb, ws, nombreHoja);
                        }

                        const datosMateria = (data.resumen || []).map(e => ({
                            'Materia': curso.name,
                            'Código': curso.code,
                            'Grupo': curso.groupCode,
                            'Documento': e.documento,
                            'Estudiante': e.name,
                            'Clases Totales': e.total,
                            'Presentes': e.present,
                            'Ausentes': e.absent,
                            'Justificados': e.justified,
                            '% Asistencia': `${e.percentage}%`
                        }));
                        resumenGeneral.push(...datosMateria);
                    } catch (err) {
                        console.error(`Error al exportar materia ${curso.name}:`, err);
                        const mensaje = err.response?.data?.error || err.message || 'Error desconocido';
                        toast.error(`Error al exportar materia ${curso.name}: ${mensaje}`);
                    }
                }

                if (resumenGeneral.length > 0) {
                    const wsResumenGeneral = xlsx.utils.json_to_sheet(resumenGeneral);
                    xlsx.utils.book_append_sheet(wb, wsResumenGeneral, 'Resumen General');
                    totalEstudiantes = resumenGeneral.length;
                }
            } else {
                cursosExportar.push(cursoSeleccionado);
                courseCount = 1;

                const data = await obtenerDataExportacion(cursoSeleccionado?.id, { ...params, suppressAudit: true }, filtros, {
                    headers: { 'x-suppress-audit': '1' }
                });
                totalEstudiantes = (data.resumen || []).length;

                const wsResumen = xlsx.utils.json_to_sheet(data.resumen.map(e => ({
                    'Documento': e.documento,
                    'Estudiante': e.name,
                    'Clases Totales': e.total,
                    'Presentes': e.present,
                    'Ausentes': e.absent,
                    'Justificados': e.justified,
                    '% Asistencia': `${e.percentage}%`
                })));
                xlsx.utils.book_append_sheet(wb, wsResumen, 'Resumen General');

                const wsRiesgo = xlsx.utils.json_to_sheet(data.enRiesgo.map(e => ({
                    'Documento': e.documento,
                    'Estudiante': e.name,
                    'Clases Totales': e.total,
                    'Presentes': e.present,
                    'Ausentes': e.absent,
                    'Justificados': e.justified,
                    '% Asistencia': `${e.percentage}%`
                })));
                xlsx.utils.book_append_sheet(wb, wsRiesgo, 'Estudiantes en Riesgo');

                const wsAsignatura = xlsx.utils.json_to_sheet(data.asignaturas.map(a => ({
                    'Documento': a.documento,
                    'Estudiante': a.estudiante,
                    'Asignatura': a.asignatura,
                    'Código': a.codigo,
                    'Grupo': a.grupo,
                    'Clases Totales': a.total,
                    'Presentes': a.present,
                    'Ausentes': a.absent,
                    'Justificados': a.justified,
                    '% Asistencia': `${a.percentage}%`
                })));
                xlsx.utils.book_append_sheet(wb, wsAsignatura, 'Faltas por Asignatura');

                const wsDirectorio = xlsx.utils.json_to_sheet(data.directorio.map(d => ({
                    'Documento': d.documento,
                    'Estudiante': d.name,
                    'Email Institucional': d.email,
                    'Email Secundario': d.correo2,
                    'WhatsApp': d.whatsapp,
                    'Teléfono 2': d.telefono2
                })));
                xlsx.utils.book_append_sheet(wb, wsDirectorio, 'Directorio de Contacto');
            }

            if (wb.SheetNames.length === 0) {
                toast.error('No hay datos para exportar en las materias seleccionadas');
                return;
            }

            const _nombre = `Reporte_Asistencia_${new Date().toISOString().split('T')[0]}.xlsx`;
            const _wbOut = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
            const _blob = new Blob([_wbOut], { type: 'application/octet-stream' });
            const _url = URL.createObjectURL(_blob);
            const _link = document.createElement('a');
            _link.href = _url;
            _link.download = _nombre;
            _link.click();
            setTimeout(() => URL.revokeObjectURL(_url), 1000);

            try {
                const courseNames = cursosExportar.map(c => c.name || c.nombre || c.code || c.id);
                await api.post('/auditoria/registro', {
                    action: 'EXPORTAR_REPORTE',
                    target: 'REPORT',
                    details: {
                        nombresCursos: courseNames,
                        cantidadCursos: courseCount,
                        fechaInicio: fechaInicio || null,
                        fechaFin: fechaFin || null,
                        totalEstudiantes: totalEstudiantes || 0
                    }
                });
            } catch (e) {
                console.warn('No se pudo registrar el log combinado de auditoría:', e?.message || e);
            }

            toast.success('Reporte exportado correctamente');
        } catch (error) {
            console.error('Error al exportar Excel:', error);
            const mensaje = error?.response?.data?.error || error?.message || 'Error desconocido';
            toast.error('Error al exportar: ' + mensaje);
        } finally {
            setExportando(false);
        }
    };

    const exportarResumenSemestral = async () => {
        setExportandoResumen(true);
        try {
            const params = {};
            if (cursoSeleccionado?.academicYear)   params.anio    = cursoSeleccionado.academicYear;
            if (cursoSeleccionado?.academicPeriod) params.periodo = cursoSeleccionado.academicPeriod;

            const respuesta = await descargarResumenSemestral(params);
            const contentDisposition = respuesta.headers['content-disposition'] || '';
            const match = /filename="?([^";]+)"?/.exec(contentDisposition);
            const nombreArchivo = match ? match[1] : `Resumen_Semestral_${new Date().toISOString().split('T')[0]}.xlsx`;

            const blob = new Blob([respuesta.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url  = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href     = url;
            link.download = nombreArchivo;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast.success('Resumen semestral descargado correctamente');
        } catch (error) {
            const mensaje = error?.response?.data?.error || error?.message || 'Error desconocido';
            toast.error('Error al descargar resumen: ' + mensaje);
        } finally {
            setExportandoResumen(false);
        }
    };


    return (
        <section className="space-y-6">
            <div className="tarjeta flex flex-wrap items-center gap-4">
                <FiltrosGlobales />
            </div>

            <header className="tarjeta flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Reportes</h2>
                        <p className="mt-1 text-sm text-texto-secundario">
                            Asistencia por estudiante con visualizaciones interactivas.
                        </p>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                        className="campo"
                        value={rangoSeleccionado}
                        onChange={manejarCambioRango}
                        aria-label="Rango de fechas"
                    >
                        <option value="personalizado">Rango personalizado</option>
                        <option value="hoy">Hoy</option>
                        <option value="esta_semana">Esta Semana</option>
                        <option value="semana_pasada">Semana Pasada</option>
                        <option value="este_mes">Este Mes</option>
                        <option value="ultimos_3_meses">Últimos 3 Meses</option>
                    </select>
                    <input
                        type="date"
                        className="campo"
                        value={fechaInicio}
                        aria-label="Fecha de inicio"
                        title="Fecha de inicio"
                        onChange={manejarCambioFechaManual(setFechaInicio)}
                    />
                    <input
                        type="date"
                        className="campo"
                        value={fechaFin}
                        aria-label="Fecha de fin"
                        title="Fecha de fin"
                        onChange={manejarCambioFechaManual(setFechaFin)}
                    />
                    <div className="flex flex-col items-start gap-2">
                        {(!esDocente || !cursoSeleccionado) && (
                            <button
                                type="button"
                                onClick={exportarExcel}
                                disabled={(datos.length === 0 && cursoSeleccionado) || exportando || (!cursoSeleccionado && cursos.length === 0)}
                                className="boton-primario inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                            >
                                {exportando ? <Loader2 size={15} className="animate-spin" aria-label="Exportando" /> : <Download size={15} aria-label="Descargar reporte detallado" />}
                                {exportando ? 'Generando...' : esDocente ? 'Descargar reporte' : 'Exportar detallado'}
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={exportarResumenSemestral}
                                disabled={exportandoResumen}
                                className="boton-secundario inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                            >
                                {exportandoResumen ? <Loader2 size={15} className="animate-spin" aria-label="Generando resumen" /> : <Download size={15} aria-label="Descargar resumen semestral" />}
                                {exportandoResumen ? 'Generando...' : 'Resumen semestral'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="tarjeta">
                    <p className="text-sm text-texto-secundario">Estudiantes reportados</p>
                    <p className="mt-2 font-mono text-2xl">{datos.length.toLocaleString('es-CO')}</p>
                </article>
                <article className="tarjeta">
                    <p className="text-sm text-texto-secundario">Promedio de asistencia</p>
                    <p
                        className="mt-2 font-mono text-2xl"
                        style={{
                            color: promedioAsistencia >= 80
                                ? 'var(--color-present)'
                                : promedioAsistencia >= 70
                                    ? 'var(--color-late)'
                                    : 'var(--color-absent)',
                        }}
                    >
                        {promedioAsistencia.toLocaleString('es-CO')}%
                    </p>
                </article>
                <article className="tarjeta">
                    <p className="text-sm text-texto-secundario">Estudiantes bajo 80% o pérdida por faltas</p>
                    <p
                        className="mt-2 font-mono text-2xl"
                        style={{ color: estudiantesEnRiesgo > 0 ? 'var(--color-absent)' : 'var(--color-text-primary)' }}
                    >
                        {estudiantesEnRiesgo.toLocaleString('es-CO')}
                    </p>
                </article>
                <article className="tarjeta">
                    <p className="text-sm text-texto-secundario">Fallas actuales (no justificadas)</p>
                    <p className="mt-2 font-mono text-2xl" style={{ color: 'var(--color-absent)' }}>
                        {totalFallasActuales.toLocaleString('es-CO')}
                    </p>
                </article>
            </section>

            <section className="tarjeta p-0">
                <div
                    className="flex items-center gap-1 px-4 pt-4 pb-0 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                >
                    {VISTAS.map(({ id, label, Icono }) => {
                        const activo = vistaActiva === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setVistaActiva(id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative"
                                style={{
                                    color: activo ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    borderBottom: activo ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    marginBottom: '-1px',
                                    background: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <Icono size={15} aria-label={label} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                { }
                {cargando ? (
                    <p className="p-6 text-sm text-texto-secundario">Cargando...</p>
                ) : datos.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                            Sin datos para los filtros seleccionados.
                        </p>
                    </div>
                ) : (
                    <>
                        {vistaActiva === 'distribucion' && (
                            <div className="p-4 pt-6">
                                <p
                                    className="mb-2 text-xs font-semibold uppercase tracking-wider text-center"
                                    style={{ color: 'var(--color-muted)' }}
                                >
                                    Distribuci&oacute;n de estudiantes por rango de asistencia
                                </p>
                                <p className="mb-6 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                                    Las inasistencias justificadas se registran como <strong>Justificados</strong> y no inciden en el umbral de pérdida por faltas.
                                </p>
                                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                                        <p className="text-xs text-texto-secundario">Presentes</p>
                                        <p className="mt-2 font-mono text-lg" style={{ color: 'var(--color-present)' }}>{totalesEstados.present.toLocaleString('es-CO')}</p>
                                    </div>
                                    <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                                        <p className="text-xs text-texto-secundario">Fallas actuales</p>
                                        <p className="mt-2 font-mono text-lg" style={{ color: 'var(--color-absent)' }}>{totalesEstados.absent.toLocaleString('es-CO')}</p>
                                    </div>
                                    <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                                        <p className="text-xs text-texto-secundario">Justificados</p>
                                        <p className="mt-2 font-mono text-lg" style={{ color: 'var(--color-excused)' }}>{totalesEstados.justified.toLocaleString('es-CO')}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,440px)_minmax(260px,1fr)] items-center gap-6">
                                    <div
                                        className="rounded-xl border p-4"
                                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                                    >
                                        <div className="h-[340px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={datosTorta}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={74}
                                                        outerRadius={118}
                                                        startAngle={90}
                                                        endAngle={-270}
                                                        paddingAngle={3}
                                                        cornerRadius={10}
                                                        dataKey="value"
                                                        stroke="none"
                                                        label={false}
                                                        labelLine={false}
                                                    >
                                                        {datosTorta.map((entry) => {
                                                            const colorIdx = ETIQUETAS_BRACKETS.indexOf(entry.name);
                                                            return (
                                                                <Cell
                                                                    key={entry.name}
                                                                    fill={getColoresBrackets()[colorIdx]}
                                                                    style={{ outline: 'none' }}
                                                                />
                                                            );
                                                        })}
                                                    </Pie>
                                                    <Tooltip content={<TooltipTorta />} cursor={false} />
                                                    <text x="50%" y="46%" textAnchor="middle" style={{ fill: 'var(--color-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                                                        TOTAL
                                                    </text>
                                                    <text x="50%" y="56%" textAnchor="middle" style={{ fill: 'var(--color-text-primary)', fontSize: '1.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                                        {datos.length.toLocaleString('es-CO')}
                                                    </text>
                                                    <text x="50%" y="65%" textAnchor="middle" style={{ fill: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                                                        estudiantes
                                                    </text>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                                            Detalle por rangos
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            {datosTorta.map((entry) => {
                                                const colorIdx = ETIQUETAS_BRACKETS.indexOf(entry.name);
                                                const pct = datos.length > 0
                                                    ? Math.round((entry.value / datos.length) * 100)
                                                    : 0;
                                                return (
                                                    <div key={entry.name}
                                                        className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                                                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                style={{
                                                                    width: 14, height: 14, borderRadius: 4,
                                                                    background: getColoresBrackets()[colorIdx],
                                                                    display: 'inline-block', flexShrink: 0,
                                                                }}
                                                            />
                                                            <div>
                                                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                                    {entry.name}
                                                                </p>
                                                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                                    {entry.value} estudiante{entry.value !== 1 ? 's' : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.875rem', fontWeight: 700,
                                                                fontFamily: 'var(--font-mono)',
                                                                color: getColoresBrackets()[colorIdx],
                                                            }}
                                                        >
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {vistaActiva === 'tiempo' && (
                            <div className="p-4">
                                <div
                                    className="mb-4 flex flex-col gap-3 rounded-xl border p-4"
                                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                                                Tendencia semanal
                                            </p>
                                            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                Evolución de presentes por semana según el agrupamiento seleccionado.
                                            </p>
                                        </div>
                                        <select
                                            value={modoGrupo}
                                            onChange={(e) => setModoGrupo(e.target.value)}
                                            style={{
                                                height: 36, border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--input-radius)', padding: '0 12px',
                                                fontSize: '0.8125rem', fontWeight: 600,
                                                color: 'var(--color-text-primary)', background: 'var(--color-surface)',
                                                cursor: 'pointer', outline: 'none', minWidth: 220,
                                            }}
                                        >
                                            {MODOS_GRUPO.map((m) => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {seriesNombres.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {seriesNombres.map((nombre, i) => (
                                                <span
                                                    key={`chip-${nombre}`}
                                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                                                    style={{
                                                        borderColor: 'var(--color-border)',
                                                        background: 'var(--color-surface)',
                                                        color: 'var(--color-text-primary)',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: 999,
                                                            background: getColoresLineas()[i % 6],
                                                            display: 'inline-block',
                                                        }}
                                                    />
                                                    {nombre}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {cargandoSemanal ? (
                                    <p className="py-10 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Cargando...</p>
                                ) : datosLineChart.length === 0 ? (
                                    <p className="py-10 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Sin datos semanales para los filtros seleccionados.</p>
                                ) : (
                                    <>
                                        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                                                <p className="text-xs text-texto-secundario">Total presentes</p>
                                                <p className="mt-2 font-mono text-lg" style={{ color: 'var(--color-present)' }}>
                                                    {datosBarrasSemanales.reduce((sum, item) => sum + (item.presente ?? 0), 0).toLocaleString('es-CO')}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                                                <p className="text-xs text-texto-secundario">Total ausentes</p>
                                                <p className="mt-2 font-mono text-lg" style={{ color: 'var(--color-absent)' }}>
                                                    {datosBarrasSemanales.reduce((sum, item) => sum + (item.ausente ?? 0), 0).toLocaleString('es-CO')}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                                                <p className="text-xs text-texto-secundario">Total justificados</p>
                                                <p className="mt-2 font-mono text-lg" style={{ color: 'var(--color-excused)' }}>
                                                    {datosBarrasSemanales.reduce((sum, item) => sum + (item.justificado ?? 0), 0).toLocaleString('es-CO')}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="mb-4 text-sm text-texto-secundario">
                                            La serie de asistencia en el tiempo separa las ausencias justificadas y no justificadas: las justificadas no implican pérdida de materia.
                                        </p>
                                        <div
                                            className="rounded-xl border p-3"
                                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                                        >
                                            <ResponsiveContainer width="100%" height={340}>
                                                <AreaChart data={datosLineChart} margin={{ top: 18, right: 24, left: -10, bottom: 4 }}>
                                                    <defs>
                                                        {seriesNombres.map((nombre, i) => {
                                                            const color = getColoresLineas()[i % 6];
                                                            return (
                                                                <linearGradient key={`colorUv${i}`} id={`colorUv${i}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.34} />
                                                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                                </linearGradient>
                                                            );
                                                        })}
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 4" stroke="var(--color-border)" vertical={false} opacity={0.6} />
                                                    <XAxis
                                                        dataKey="semana"
                                                        tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                                                        axisLine={false} tickLine={false}
                                                        dy={12}
                                                    />
                                                    <YAxis
                                                        allowDecimals={false}
                                                        tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}
                                                        axisLine={false} tickLine={false}
                                                        dx={-8}
                                                    />
                                                    <Tooltip content={<TooltipSemanal />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                    {seriesNombres.map((nombre, i) => (
                                                        <Area
                                                            key={nombre}
                                                            type="monotone"
                                                            dataKey={nombre}
                                                            stroke={getColoresLineas()[i % 6]}
                                                            fillOpacity={1}
                                                            fill={`url(#colorUv${i})`}
                                                            strokeWidth={2.8}
                                                            activeDot={{ r: 5, strokeWidth: 0, fill: getColoresLineas()[i % 6] }}
                                                            dot={false}
                                                        />
                                                    ))}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {vistaActiva === 'tabla' && (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                        <tr className="text-left text-texto-secundario">
                                            <th className="px-4 py-3 font-medium">#</th>
                                            <th className="px-4 py-3 font-medium">Estudiante</th>
                                            <th className="px-4 py-3 font-medium">Clases</th>
                                            <th className="px-4 py-3 font-medium">Presentes</th>
                                            <th className="px-4 py-3 font-medium">Fallas actuales</th>
                                            <th className="px-4 py-3 font-medium">Justificados</th>
                                            {tieneUmbralFaltas && (
                                                <th className="px-4 py-3 font-medium text-center">Límite faltas</th>
                                            )}
                                            {tieneUmbralFaltas && (
                                                <th className="px-4 py-3 font-medium text-center">Perdida</th>
                                            )}
                                            <th className="px-4 py-3 text-right font-medium">% Asistencia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {datos.map((item, idx) => (
                                            <tr
                                                key={item.id}
                                                className="border-b transition-colors"
                                                style={{ borderColor: 'var(--color-border)' }}
                                            >
                                                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-texto">{formatearNombre(item.name)}</td>
                                                <td className="px-4 py-3">{Number(item.total).toLocaleString('es-CO')}</td>
                                                <td className="px-4 py-3" style={{ color: 'var(--color-present)', fontWeight: 600 }}>
                                                    {Number(item.present).toLocaleString('es-CO')}
                                                </td>
                                                <td className="px-4 py-3" style={{ color: item.absent > 0 ? 'var(--color-absent)' : 'inherit', fontWeight: item.absent > 0 ? 600 : 400 }}>
                                                    {Number(item.absent ?? 0).toLocaleString('es-CO')}
                                                </td>
                                                <td className="px-4 py-3" style={{ color: item.justified > 0 ? 'var(--color-excused)' : 'inherit', fontWeight: item.justified > 0 ? 600 : 400 }}>
                                                    {Number(item.justified ?? 0).toLocaleString('es-CO')}
                                                </td>
                                                {tieneUmbralFaltas && (
                                                    <td className="px-4 py-3 text-center font-mono text-sm" style={{ color: item.failedByAbsence ? 'var(--color-absent)' : 'var(--color-text-secondary)' }}>
                                                        {item.absencesAllowed ?? '-'}
                                                    </td>
                                                )}
                                                {tieneUmbralFaltas && (
                                                    <td className="px-4 py-3 text-center" style={{ color: item.failedByAbsence ? 'var(--color-absent)' : 'var(--color-text-secondary)', fontWeight: item.failedByAbsence ? 700 : 500 }}>
                                                        {item.failedByAbsence ? 'Sí' : 'No'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-right">
                                                    <span
                                                        className="inline-flex items-center px-2 py-0.5 rounded-[var(--badge-radius)] font-mono font-semibold text-xs"
                                                        style={{
                                                            background:
                                                                item.percentage >= 90 ? 'var(--color-present-bg)' :
                                                                    item.percentage >= 80 ? 'var(--color-accent-light)' :
                                                                        item.percentage >= 70 ? 'var(--color-late-bg)' :
                                                                            'var(--color-absent-bg)',
                                                            color:
                                                                item.percentage >= 90 ? 'var(--color-present)' :
                                                                    item.percentage >= 80 ? 'var(--color-accent-dark)' :
                                                                        item.percentage >= 70 ? 'var(--color-late)' :
                                                                            'var(--color-absent)',
                                                        }}
                                                    >
                                                        {Number(item.percentage).toLocaleString('es-CO')}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </section>

        </section>
    );
}

