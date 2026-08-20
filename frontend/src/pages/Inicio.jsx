import { useEffect, useMemo, useState } from 'react';
import { Users, Percent, UserX } from 'lucide-react';
import { obtenerAsistencia, obtenerEstudiantes, obtenerAsistenciaHoyPorCurso } from '../services/api';
import { useCurso } from '../context/ContextoCurso';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import FiltrosGlobales from '../components/FiltrosGlobales';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

    const [asistenciaTodas, setAsistenciaTodas] = useState([]);

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
            
            try {
                if (!cursoSeleccionado && isAdmin) {
                    try {
                        const datosHoy = await obtenerAsistenciaHoyPorCurso();
                        setAsistenciaTodas(Array.isArray(datosHoy) ? datosHoy : []);
                    } catch (errorAsistenciaTodas) {
                        console.error('[Inicio] No se pudo cargar asistencia de hoy (todas las materias):', errorAsistenciaTodas);
                        setAsistenciaTodas([]);
                    }
                } else if (cursoSeleccionado) {
                    const hoy = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'America/Bogota',
                        year: 'numeric', month: '2-digit', day: '2-digit',
                    }).format(new Date());

                    const [estudiantesRes, asistenciaHoyRes, historialRes] = await Promise.allSettled([
                        obtenerEstudiantes(cursoSeleccionado.id, filtros),
                        obtenerAsistencia(cursoSeleccionado.id, hoy, filtros),
                        obtenerAsistencia(cursoSeleccionado.id, undefined, filtros),
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

                    const totalFallos = [estudiantesRes, asistenciaHoyRes, historialRes]
                        .filter((resultado) => resultado.status === 'rejected').length;

                    if (totalFallos > 0) {
                        console.error('[Inicio] Fallas parciales al cargar panel:', {
                            estudiantes: estudiantesRes.status === 'rejected' ? estudiantesRes.reason : null,
                            asistenciaHoy: asistenciaHoyRes.status === 'rejected' ? asistenciaHoyRes.reason : null,
                            historial: historialRes.status === 'rejected' ? historialRes.reason : null,
                        });
                    }

                    if (totalFallos === 3) {
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
                <FiltrosGlobales />
            </div>

            <header className="tarjeta flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Panel Principal</h2>
                        <p className="mt-1 text-sm text-texto-secundario">
                            {!cursoSeleccionado ? 'Asistencia de hoy en todas las materias.' : 'Resumen diario del curso seleccionado.'}
                        </p>
                    </div>
                </div>
            </header>

            {!cursoSeleccionado && isAdmin ? (

                <section className="tarjeta">
                    <h3 className="mb-4 text-lg font-medium">% de asistencia hoy (todas las materias)</h3>
                    {asistenciaTodas.length === 0 ? (
                        <p className="text-sm text-texto-secundario">No hay registros de asistencia para el día de hoy.</p>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center justify-center gap-10 py-6">
                            <ResponsiveContainer width={240} height={240}>
                                <PieChart>
                                    <Pie
                                        data={asistenciaTodas}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="porcentaje"
                                        nameKey="nombre"
                                    >
                                        {asistenciaTodas.map((entry, index) => (
                                            <Cell key={entry.id} fill={COLORES_CURSOS[index % COLORES_CURSOS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value}%`} />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="flex flex-col gap-3">
                                {asistenciaTodas.map((entry, index) => (
                                    <div key={entry.id} className="flex items-center gap-3">
                                        <span
                                            style={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: 4,
                                                background: COLORES_CURSOS[index % COLORES_CURSOS.length],
                                                display: 'inline-block',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <div>
                                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                {entry.nombre}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                Asistencia: {entry.porcentaje}%
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            ) : (

                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        {kpis.map((item) => {
                            const Icono = item.icono;
                            return (
                                <article key={item.titulo} className="tarjeta">
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

                    <section className="tarjeta">
                        <h3 className="mb-4 text-lg font-medium">Actividad reciente</h3>
                        {actividadReciente.length === 0 ? (
                            <p className="text-sm text-texto-secundario">No hay actividad reciente</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px] text-sm">
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
                                                    <td className="px-4 py-3">{new Date(item.date).toLocaleDateString('es-CO')}</td>
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
                </>
            )}
        </section>
    );
}
