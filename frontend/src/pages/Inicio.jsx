import { useEffect, useMemo, useState } from 'react';
import { Users, Percent, UserX } from 'lucide-react';
import { obtenerAsistencia, obtenerEstudiantes, obtenerAsistenciaHoyPorCurso, obtenerReportes } from '../services/api';
import { useCurso } from '../context/ContextoCurso';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import FiltrosGlobales from '../components/FiltrosGlobales';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const formatearFechaAsistencia = (fecha) => {
    const [anio, mes, dia] = String(fecha).split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO');
};

const cssCache = new Map();
function v(variable) {
    if (typeof window === 'undefined') return '#000';
    if (cssCache.has(variable)) return cssCache.get(variable);
    
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    if (value) {
        cssCache.set(variable, value);
        return value;
    }
    return '#000';
}

const _COLORES_FALLBACK = ['#6B2D8B', '#8DC63F', '#D97706', '#4E1F68', '#DC2626', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const COLORES_CURSOS = _COLORES_FALLBACK.map((f, i) => v(`--color-course-${i + 1}`) || f);

export default function Inicio() {
    const { usuario } = useAutenticacion();
    const {
        cursoSeleccionado,
        codigoSeleccionado,
        grupoSeleccionado,
        docenteSeleccionado,
    } = useCurso();

    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(false);
    
    const [totalEstudiantes, setTotalEstudiantes] = useState(0);
    const [porcentajeHoy, setPorcentajeHoy] = useState(null);
    const [ausentesHoy, setAusentesHoy] = useState(null);
    const [huboClaseHoy, setHuboClaseHoy] = useState(false);
    const [actividadReciente, setActividadReciente] = useState([]);
    const [alertasRiesgo, setAlertasRiesgo] = useState([]);
    const [proximasClases, setProximasClases] = useState([]);

    const [asistenciaTodas, setAsistenciaTodas] = useState([]);
    const [cargandoAlertas, setCargandoAlertas] = useState(false);

    const isAdmin = usuario?.role === 'ADMIN';

    const filtros = useMemo(() => ({
        codigo:    codigoSeleccionado,
        grupo:     grupoSeleccionado,
        docenteId: docenteSeleccionado,
    }), [codigoSeleccionado, grupoSeleccionado, docenteSeleccionado]);

    useEffect(() => {
        const cargarPanel = async () => {
            setCargando(true);
            setErrorCarga(false);
            setCargandoAlertas(true);
            
            try {
                if (isAdmin && !docenteSeleccionado) {
                    setTotalEstudiantes(0);
                    setPorcentajeHoy(null);
                    setAusentesHoy(null);
                    setHuboClaseHoy(false);
                    setActividadReciente([]);
                    setAlertasRiesgo([]);
                    setAsistenciaTodas([]);
                    setProximasClases([]);
                } else if (!cursoSeleccionado && isAdmin) {
                    try {
                        const datosHoy = await obtenerAsistenciaHoyPorCurso();
                        const asistencia = Array.isArray(datosHoy) ? datosHoy : [];
                        setAsistenciaTodas(asistencia);

                        const totalRecords = asistencia.reduce((sum, curso) => sum + (curso.total || 0), 0);
                        const totalPresentes = asistencia.reduce((sum, curso) => sum + (curso.presentes || 0), 0);
                        const totalAusentes = Math.max(totalRecords - totalPresentes, 0);
                        const porcentaje = totalRecords > 0 ? Math.round((totalPresentes / totalRecords) * 100) : 0;

                        setTotalEstudiantes(totalRecords);
                        setPorcentajeHoy(porcentaje);
                        setAusentesHoy(totalAusentes);
                        setHuboClaseHoy(asistencia.length > 0);
                        setActividadReciente([]);
                        setProximasClases([]);

                        const alertasGlobales = asistencia
                            .filter(c => c.porcentaje <= 80)
                            .slice(0, 5)
                            .map(c => ({
                                id: c.id,
                                nombre: c.nombre,
                                detalle: c.teacher ? `Docente: ${c.teacher}` : 'Docente desconocido',
                                porcentaje: c.porcentaje,
                                ausencias: (c.total || 0) - (c.presentes || 0),
                            }));
                        setAlertasRiesgo(alertasGlobales);
                    } catch (errorAsistenciaTodas) {
                        console.error('[Inicio] No se pudo cargar asistencia de hoy (todas las materias):', errorAsistenciaTodas);
                        setAsistenciaTodas([]);
                        setTotalEstudiantes(0);
                        setPorcentajeHoy(null);
                        setAusentesHoy(null);
                        setHuboClaseHoy(false);
                        setAlertasRiesgo([]);
                        setActividadReciente([]);
                        setProximasClases([]);
                    }
                } else if (cursoSeleccionado) {
                    const hoy = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'America/Bogota',
                        year: 'numeric', month: '2-digit', day: '2-digit',
                    }).format(new Date());

                    const [estudiantesRes, asistenciaHoyRes, historialRes, reportesRes] = await Promise.allSettled([
                        obtenerEstudiantes(cursoSeleccionado.id, filtros),
                        obtenerAsistencia(cursoSeleccionado.id, hoy, filtros),
                        obtenerAsistencia(cursoSeleccionado.id, undefined, filtros),
                        obtenerReportes(cursoSeleccionado.id, { startDate: hoy, endDate: hoy })
                    ]);

                    const estudiantes = estudiantesRes.status === 'fulfilled' && Array.isArray(estudiantesRes.value)
                        ? estudiantesRes.value
                        : [];
                    const asistenciaHoy = asistenciaHoyRes.status === 'fulfilled' && Array.isArray(asistenciaHoyRes.value)
                        ? asistenciaHoyRes.value
                        : [];
                    const historial = historialRes.status === 'fulfilled' && Array.isArray(historialRes.value)
                        ? historialRes.value
                        : [];
                    const reportesHoy = reportesRes.status === 'fulfilled' && Array.isArray(reportesRes.value)
                        ? reportesRes.value
                        : [];

                    const totalFallos = [estudiantesRes, asistenciaHoyRes, historialRes, reportesRes]
                        .filter((resultado) => resultado.status === 'rejected').length;

                    if (totalFallos > 0) {
                        console.error('[Inicio] Fallas parciales al cargar panel:', {
                            estudiantes: estudiantesRes.status === 'rejected' ? estudiantesRes.reason : null,
                            asistenciaHoy: asistenciaHoyRes.status === 'rejected' ? asistenciaHoyRes.reason : null,
                            historial: historialRes.status === 'rejected' ? historialRes.reason : null,
                        });
                    }

                    if (totalFallos === 4) {
                        setErrorCarga(true);
                        return;
                    }

                    const presentes = asistenciaHoy.filter((registro) => registro.present).length;
                    const total = estudiantes.length;
                    const hayClaseHoy = asistenciaHoy.length > 0;

                    setTotalEstudiantes(total);
                    setHuboClaseHoy(hayClaseHoy);

                    if (hayClaseHoy) {
                        const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;
                        setPorcentajeHoy(porcentaje);
                        setAusentesHoy(Math.max(total - presentes, 0));
                    } else {
                        setPorcentajeHoy(null);
                        setAusentesHoy(null);
                    }

                    setActividadReciente(historial.slice(0, 8));

                    const reportesEnRiesgo = reportesHoy
                        .filter(r => r.failedByAbsence || r.percentage <= 80)
                        .slice(0, 5)
                        .map(r => ({
                            id: r.id || `${r.name}-${r.percentage}`,
                            nombre: r.name || r.id || 'Estudiante',
                            porcentaje: r.percentage ?? 0,
                            ausencias: r.absent ?? 0,
                        }));

                    setAlertasRiesgo(reportesEnRiesgo);

                    const proximas = [];
                    if (cursoSeleccionado?.dia) {
                        proximas.push({
                            id: 'clase-1',
                            dia: cursoSeleccionado.dia,
                            horaInicio: cursoSeleccionado.horaInicio,
                            horaFin: cursoSeleccionado.horaFin,
                            materia: cursoSeleccionado.name,
                        });
                    }
                    if (cursoSeleccionado?.dia2) {
                        proximas.push({
                            id: 'clase-2',
                            dia: cursoSeleccionado.dia2,
                            horaInicio: cursoSeleccionado.horaInicio2,
                            horaFin: cursoSeleccionado.horaFin2,
                            materia: cursoSeleccionado.name,
                        });
                    }
                    setProximasClases(proximas.slice(0, 2));
                }
            } catch (err) {
                if (err?.response?.status === 403) {
                    setTotalEstudiantes(0);
                    setPorcentajeHoy(null);
                    setAusentesHoy(null);
                    setHuboClaseHoy(false);
                    setActividadReciente([]);
                    setAsistenciaTodas([]);
                } else {
                    console.error('[Inicio] Error al cargar panel:', err);
                    setErrorCarga(true);
                }
            } finally {
                setCargando(false);
                setCargandoAlertas(false);
            }
        };

        cargarPanel();
    }, [cursoSeleccionado, codigoSeleccionado, grupoSeleccionado, docenteSeleccionado, isAdmin]);

    const kpis = useMemo(
        () => [
            {
                titulo: 'Total de estudiantes',
                valor: totalEstudiantes.toLocaleString('es-CO'),
                icono: Users,
                colorValor: undefined,
            },
            {
                titulo: '% de asistencia hoy',
                valor: huboClaseHoy ? `${porcentajeHoy.toLocaleString('es-CO')}%` : '—',
                subtitulo: !huboClaseHoy && cursoSeleccionado ? 'Sin clase registrada hoy' : undefined,
                icono: Percent,
                colorValor: !huboClaseHoy ? 'var(--color-muted)' : undefined,
            },
            {
                titulo: 'Ausentes hoy',
                valor: huboClaseHoy ? ausentesHoy.toLocaleString('es-CO') : '—',
                subtitulo: !huboClaseHoy && cursoSeleccionado ? 'Sin clase registrada hoy' : undefined,
                icono: UserX,
                colorValor: !huboClaseHoy ? 'var(--color-muted)' : undefined,
            },
        ],
        [ausentesHoy, porcentajeHoy, totalEstudiantes, huboClaseHoy, cursoSeleccionado],
    );

    if (cargando) {
        return <p className="text-sm text-texto-secundario">Cargando...</p>;
    }

    if (errorCarga) {
        return <p className="text-sm font-medium text-ausente">Error al cargar los datos</p>;
    }


    return (
        <section className="space-y-6">
            <div className="tarjeta flex flex-wrap items-center gap-4">
                <FiltrosGlobales
                    textoDocenteSinSeleccion="Seleccione un docente"
                    mostrarTodas={false}
                />
            </div>

            <header className="tarjeta flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Panel Principal</h2>
                        <p className="mt-1 text-sm text-texto-secundario">
                            {!docenteSeleccionado && isAdmin
                                ? 'Selecciona un docente para consultar su información.'
                                : !cursoSeleccionado && isAdmin
                                ? 'Selecciona una materia para consultar su información.'
                                : !cursoSeleccionado
                                ? 'Selecciona una materia para consultar su información.'
                                : 'Resumen diario del curso seleccionado.'}
                        </p>
                    </div>
                </div>
            </header>

            {isAdmin && !docenteSeleccionado ? (
                <section className="tarjeta">
                    <p className="text-sm text-texto-secundario">Selecciona un docente para cargar el panel principal.</p>
                </section>
            ) : isAdmin && !cursoSeleccionado ? (
                <section className="tarjeta">
                    <p className="text-sm text-texto-secundario">Selecciona una materia para cargar el panel principal.</p>
                </section>
            ) : !cursoSeleccionado && isAdmin ? (

                <section className="grid gap-4 lg:grid-cols-3">
                    <article className="tarjeta">
                        <h3 className="mb-4 text-lg font-medium">Tamaño del portafolio</h3>
                        <p className="text-3xl font-bold">{totalEstudiantes.toLocaleString('es-CO')}</p>
                        <p className="mt-2 text-sm text-texto-secundario">registros de asistencia sumados</p>
                    </article>

                    <article className="tarjeta">
                        <h3 className="mb-4 text-lg font-medium">Asistencia general</h3>
                        <p className="text-3xl font-bold">{huboClaseHoy ? `${porcentajeHoy.toLocaleString('es-CO')}%` : '—'}</p>
                        {huboClaseHoy && <p className="mt-2 text-sm text-texto-secundario">Basado en los cursos con registro hoy</p>}
                    </article>

                    <article className="tarjeta">
                        <h3 className="mb-4 text-lg font-medium">Ausentes totales</h3>
                        <p className="text-3xl font-bold">{huboClaseHoy ? ausentesHoy.toLocaleString('es-CO') : '—'}</p>
                        {huboClaseHoy && <p className="mt-2 text-sm text-texto-secundario">Todos los cursos activos</p>}
                    </article>

                    <section className="tarjeta lg:col-span-2">
                        <h3 className="mb-4 text-lg font-medium">Cursos con peor asistencia hoy</h3>
                        {asistenciaTodas.length === 0 ? (
                            <p className="text-sm text-texto-secundario">No hay registros de asistencia para hoy.</p>
                        ) : (
                            <ul className="space-y-3">
                                {asistenciaTodas
                                    .slice()
                                    .sort((a, b) => a.porcentaje - b.porcentaje)
                                    .slice(0, 5)
                                    .map((entry, index) => (
                                        <li key={entry.id} className="rounded-lg border border-border p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-texto-primario">{entry.nombre}</p>
                                                    {entry.teacher && (
                                                        <p className="text-sm text-texto-secundario">Docente: {entry.teacher}</p>
                                                    )}
                                                </div>
                                                <span className="font-mono text-sm text-ausente">{entry.porcentaje}%</span>
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </section>

                    <section className="tarjeta">
                        <h3 className="mb-4 text-lg font-medium">Alertas globales</h3>
                        {cargandoAlertas ? (
                            <p className="text-sm text-texto-secundario">Cargando alertas...</p>
                        ) : alertasRiesgo.length === 0 ? (
                            <p className="text-sm text-texto-secundario">No hay cursos con baja asistencia hoy.</p>
                        ) : (
                            <ul className="space-y-3">
                                {alertasRiesgo.map((item) => (
                                    <li key={item.id} className="rounded-lg border border-border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-texto-primario">{item.nombre}</p>
                                                <p className="text-sm text-texto-secundario">{item.detalle}</p>
                                            </div>
                                            <span className="font-mono text-sm text-ausente">{item.porcentaje}%</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </section>
            ) : (

                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        {kpis.map((item) => {
                            const Icono = item.icono;
                            return (
                                <article
                                    key={item.titulo}
                                    className="tarjeta cursor-pointer transition hover:-translate-y-0.5"
                                    onClick={() => item.action && manejarAccionKPI(item.action)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-acento/10 flex items-center justify-center">
                                                <Icono size={18} className="text-acento" />
                                            </div>
                                            <div>
                                                <span className="text-sm text-texto-secundario">{item.titulo}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-mono text-3xl font-bold" style={item.colorValor ? { color: item.colorValor } : undefined}>
                                                {item.valor}
                                            </div>
                                            {item.subtitulo && (
                                                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                                                    {item.subtitulo}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <section className="tarjeta">
                            <h3 className="mb-4 text-lg font-medium">Actividad reciente</h3>
                            {actividadReciente.length === 0 ? (
                                <p className="text-sm text-texto-secundario">No hay actividad reciente</p>
                            ) : (
                                <div>
                                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                        <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                            <tr className="text-left text-texto-secundario">
                                                <th className="px-4 py-3 font-medium">Fecha</th>
                                                <th className="px-4 py-3 font-medium">Presentes</th>
                                                <th className="px-4 py-3 font-medium">Total</th>
                                                <th className="px-4 py-3 text-right font-medium">Porcentaje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {actividadReciente.map((item) => {
                                                const porcentajeFila = item.total > 0 ? Math.round((item.presentCount / item.total) * 100) : 0;
                                                return (
                                                    <tr key={item.date} className="border-b">
                                                        <td className="px-4 py-3">{formatearFechaAsistencia(item.date)}</td>
                                                        <td className="px-4 py-3">{Number(item.presentCount).toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-3">{Number(item.total).toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{porcentajeFila.toLocaleString('es-CO')}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="tarjeta">
                            <h3 className="mb-4 text-lg font-medium">Alertas de riesgo</h3>
                            {cargandoAlertas ? (
                                <p className="text-sm text-texto-secundario">Cargando alertas...</p>
                            ) : alertasRiesgo.length === 0 ? (
                                <p className="text-sm text-texto-secundario">No hay estudiantes en riesgo para este curso.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {alertasRiesgo.map((item) => (
                                        <li key={item.id} className="rounded-lg border border-border p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-texto-primario">{item.nombre}</p>
                                                    <p className="text-sm text-texto-secundario">Ausencias: {item.ausencias.toLocaleString('es-CO')}</p>
                                                </div>
                                                <span className="font-mono text-sm text-ausente">{item.porcentaje.toLocaleString('es-CO')}%</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="tarjeta">
                            <h3 className="mb-4 text-lg font-medium">Próximas clases</h3>
                            {proximasClases.length === 0 ? (
                                <p className="text-sm text-texto-secundario">No hay clases programadas para el curso seleccionado.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {proximasClases.map((clase) => (
                                        <li key={clase.id} className="rounded-lg border border-border p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-texto-primario">{clase.materia}</p>
                                                    <p className="text-sm text-texto-secundario">{clase.dia}</p>
                                                </div>
                                                <span className="font-mono text-sm text-texto-secundario">{clase.horaInicio} - {clase.horaFin}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </>
            )}
        </section>
    );
}
