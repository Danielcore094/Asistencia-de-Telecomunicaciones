import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Loader2, RefreshCw, Save, Smartphone, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { obtenerAsistencia, obtenerEstudiantes, guardarAsistencia, obtenerErroresWhatsApp, reintentarNotificacionWhatsApp } from '../services/api';
import { useCurso } from '../context/ContextoCurso';
import FiltrosGlobales from '../components/FiltrosGlobales';
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../context/ContextoAutenticacion';
const mostrarNombreOriginal = (nombre = '') => nombre.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();

const estadosAsistencia = [
    { valor: 'Presente', icono: CheckCircle2, colorTexto: 'text-presente', colorFondo: 'var(--color-present-bg)' },
    { valor: 'Ausente', icono: XCircle, colorTexto: 'text-ausente', colorFondo: 'var(--color-absent-bg)' },
    { valor: 'Justificado', icono: FileText, colorTexto: 'text-justificado', colorFondo: 'var(--color-excused-bg)' },
];

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const obtenerDiaSemana = (fechaStr) => {
    if (!fechaStr) return null;
    const [year, month, day] = fechaStr.split('-');
    const date = new Date(year, month - 1, day);
    const dayIndex = date.getDay();
    const indices = [6, 0, 1, 2, 3, 4, 5];
    return diasSemana[indices[dayIndex]];
};

const formatearFechaLocal = (fechaDate) => {
    const year = fechaDate.getFullYear();
    const month = String(fechaDate.getMonth() + 1).padStart(2, '0');
    const day = String(fechaDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const explicarMotivoWhatsApp = (motivo) => {
    if (!motivo) return 'No fue posible enviar la notificación.';

    const motivoNormalizado = String(motivo).toLowerCase();
    if (motivoNormalizado === 'fetch failed' || motivoNormalizado.includes('network')) {
        return 'No se pudo conectar con WhatsApp. Verifique que el servicio esté disponible y reintente.';
    }
    if (motivoNormalizado.includes('sin número')) {
        return 'El estudiante no tiene un número de WhatsApp registrado.';
    }
    if (motivoNormalizado.includes('exists') && motivoNormalizado.includes('false')) {
        return 'El número de WhatsApp no está registrado en WhatsApp o no está disponible. Verifique el número y reintente.';
    }
    if (motivoNormalizado.includes('evolution 400') || motivoNormalizado.includes('bad request')) {
        return 'WhatsApp rechazó el número o los datos del mensaje. Verifique el número registrado y reintente.';
    }
    if (motivoNormalizado.includes('evolution 401')) {
        return 'La conexión con WhatsApp fue rechazada. Verifique la clave de la API.';
    }
    if (motivoNormalizado.includes('evolution 403')) {
        return 'La conexión con WhatsApp no tiene autorización para enviar mensajes.';
    }
    if (motivoNormalizado.includes('evolution 404')) {
        return 'La instancia de WhatsApp no fue encontrada o no está disponible.';
    }
    if (motivoNormalizado.includes('evolution 408')) {
        return 'WhatsApp tardó demasiado en responder. Intente nuevamente.';
    }
    if (motivoNormalizado.includes('evolution 429')) {
        return 'WhatsApp está limitando los envíos temporalmente. Intente nuevamente más tarde.';
    }

    return motivo;
};

export default function Asistencia() {
    const { usuario } = useAutenticacion();
    
    const {
        cursoSeleccionado,
        codigoSeleccionado,
        grupoSeleccionado,
        docenteSeleccionado,
    } = useCurso();

    if (usuario?.role === 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    const [estudiantes, setEstudiantes] = useState([]);
    const [fecha, setFecha] = useState(formatearFechaLocal(new Date()));
    const [asistencia, setAsistencia] = useState({});
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [erroresWhatsApp, setErroresWhatsApp] = useState([]);
    const [cargandoErroresWhatsApp, setCargandoErroresWhatsApp] = useState(false);
    const [reintentandoWhatsApp, setReintentandoWhatsApp] = useState(null);

    const filtros = {
        codigo: codigoSeleccionado,
        grupo: grupoSeleccionado,
        docenteId: docenteSeleccionado,
    };

    const diaDeFecha = obtenerDiaSemana(fecha);
    const sinMateriaParaElDia = cursoSeleccionado
        ? cursoSeleccionado.dia !== diaDeFecha && cursoSeleccionado.dia2 !== diaDeFecha
        : false;

    useEffect(() => {
        let isCurrent = true;

        const cargarDatosActuales = async () => {
            if (!cursoSeleccionado || sinMateriaParaElDia) return;
            setCargando(true);
            try {
                const [listaEstudiantes, asistenciaExistente] = await Promise.all([
                    obtenerEstudiantes(cursoSeleccionado.id),
                    obtenerAsistencia(cursoSeleccionado.id, fecha),
                ]);

                if (!isCurrent) return;

                setEstudiantes(listaEstudiantes);

                const mapaAsistencia = {};
                if (asistenciaExistente.length > 0) {
                    asistenciaExistente.forEach((registro) => {
                        mapaAsistencia[registro.studentId] =
                            registro.status || (registro.present ? 'Presente' : 'Ausente');
                    });
                }
                setAsistencia(mapaAsistencia);
            } catch (_error) {
                if (!isCurrent) return;
                toast.error('Error al cargar datos');
            } finally {
                if (isCurrent) setCargando(false);
            }
        };

        if (cursoSeleccionado && !sinMateriaParaElDia) {
            cargarDatosActuales();
        } else {
            setEstudiantes([]);
            setAsistencia({});
            setCargando(false);
        }

        return () => {
            isCurrent = false;
        };
    }, [fecha, cursoSeleccionado, codigoSeleccionado, grupoSeleccionado, docenteSeleccionado, sinMateriaParaElDia]);

    const cargarErroresWhatsApp = async () => {
        if (!cursoSeleccionado) {
            setErroresWhatsApp([]);
            return;
        }

        setCargandoErroresWhatsApp(true);
        try {
            const respuesta = await obtenerErroresWhatsApp(cursoSeleccionado.id, 50);
            setErroresWhatsApp(respuesta.logs || []);
        } catch (_error) {
            setErroresWhatsApp([]);
        } finally {
            setCargandoErroresWhatsApp(false);
        }
    };

    useEffect(() => {
        cargarErroresWhatsApp();
    }, [cursoSeleccionado]);

    const manejarReintentoWhatsApp = async (registro) => {
        setReintentandoWhatsApp(registro.id);
        try {
            const resultado = await reintentarNotificacionWhatsApp(registro.id);
            if (resultado.success) {
                toast.success(`Notificación enviada a ${registro.estudiante}`);
            } else {
                toast.error(resultado.error || 'El envío volvió a fallar');
            }
            await cargarErroresWhatsApp();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo reintentar la notificación');
        } finally {
            setReintentandoWhatsApp(null);
        }
    };

    const cambiarEstado = (studentId, estado) => {
        setAsistencia((previo) => ({ ...previo, [studentId]: estado }));
    };

    const manejarGuardarAsistencia = async () => {
        if (!cursoSeleccionado) return;
        const registros = estudiantes.map((estudiante) => ({
            studentId: estudiante.id,
            status: asistencia[estudiante.id] || 'Ausente',
        }));

        setGuardando(true);
        try {
            await guardarAsistencia({ date: fecha, courseId: cursoSeleccionado.id, records: registros });
            toast.success('Asistencia guardada correctamente');
        } catch (_error) {
            toast.error('Error al guardar asistencia');
        } finally {
            setGuardando(false);
        }
    };

    const conteo = estadosAsistencia.reduce((acumulado, estado) => {
        acumulado[estado.valor] = Object.values(asistencia).filter((item) => item === estado.valor).length;
        return acumulado;
    }, {});

    const getLimitesFecha = () => {
        const hoy = new Date();
        const hoyStr = formatearFechaLocal(hoy);

        const hace5Dias = new Date(hoy);
        hace5Dias.setDate(hace5Dias.getDate() - 5);

        const diaSemana = hoy.getDay();
        const hora = hoy.getHours();

        const fechaCorte = new Date(hoy);
        if (diaSemana === 0 && hora < 2) {
            fechaCorte.setDate(fechaCorte.getDate() - 7);
        } else if (diaSemana !== 0) {
            fechaCorte.setDate(fechaCorte.getDate() - diaSemana);
        }

        fechaCorte.setHours(0, 0, 0, 0);

        const minDate = hace5Dias > fechaCorte ? hace5Dias : fechaCorte;
        const minStr = formatearFechaLocal(minDate);

        return { max: hoyStr, min: minStr };
    };

    const { min: minFecha, max: maxFecha } = getLimitesFecha();
    const fechaValida = fecha >= minFecha && fecha <= maxFecha;

    return (
        <section className="space-y-6">
            <div className="tarjeta flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <FiltrosGlobales filtroDia={obtenerDiaSemana(fecha)} mostrarTodas={false} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <label htmlFor="fecha-asistencia" style={{ fontSize: '0.8125rem', fontWeight: '500', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
                        Fecha:
                    </label>
                    <input
                        id="fecha-asistencia"
                        type="date"
                        min={minFecha}
                        max={maxFecha}
                        value={fecha}
                        onChange={(evento) => setFecha(evento.target.value)}
                        style={{
                            height: '36px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--input-radius)',
                            padding: '0 10px',
                            fontSize: '0.8125rem',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: '500',
                            color: 'var(--color-text-primary)',
                            background: 'var(--color-surface)',
                            width: '140px',
                            outline: 'none'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'var(--color-primary)';
                            e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'var(--color-border)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>
            </div>

            <header className="tarjeta flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Asistencia</h2>
                        <p className="mt-1 text-sm text-texto-secundario">Registra el estado diario por estudiante.</p>
                    </div>
                </div>
            </header>

            {(erroresWhatsApp.length > 0 || cargandoErroresWhatsApp) && (
                <section className="tarjeta p-0">
                    <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
                        <div>
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Smartphone size={20} className="text-ausente" /> Errores de WhatsApp
                            </h3>
                            <p className="mt-1 text-sm text-texto-secundario">
                                Estas notificaciones no pudieron enviarse. Solo los errores pueden reintentarse.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={cargarErroresWhatsApp}
                            disabled={cargandoErroresWhatsApp}
                            className="boton-secundario inline-flex items-center gap-2 shrink-0 disabled:opacity-60"
                            aria-label="Actualizar errores de WhatsApp"
                        >
                            <RefreshCw size={16} className={cargandoErroresWhatsApp ? 'animate-spin' : ''} aria-label="Actualizar" />
                            Actualizar
                        </button>
                    </div>
                    {cargandoErroresWhatsApp ? (
                        <p className="p-6 text-sm text-texto-secundario">Cargando errores...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                    <tr className="text-left text-texto-secundario">
                                        <th className="px-4 py-3 font-medium">Estudiante</th>
                                        <th className="px-4 py-3 font-medium">WhatsApp</th>
                                        <th className="px-4 py-3 font-medium">Fecha</th>
                                        <th className="px-4 py-3 font-medium">Motivo</th>
                                        <th className="px-4 py-3 font-medium text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {erroresWhatsApp.map((registro) => (
                                        <tr key={registro.id} className="tabla-fila">
                                            <td className="px-4 py-3 font-medium">{registro.estudiante}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-texto-secundario">{registro.whatsapp}</td>
                                            <td className="px-4 py-3 text-texto-secundario whitespace-nowrap">{registro.fecha}</td>
                                            <td className="px-4 py-3 text-xs text-ausente">{explicarMotivoWhatsApp(registro.error)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => manejarReintentoWhatsApp(registro)}
                                                    disabled={reintentandoWhatsApp === registro.id}
                                                    className="boton-secundario inline-flex items-center gap-2 text-xs disabled:opacity-60"
                                                    aria-label={`Reintentar envío a ${registro.estudiante}`}
                                                >
                                                    {reintentandoWhatsApp === registro.id
                                                        ? <Loader2 size={14} className="animate-spin" aria-label="Reintentando" />
                                                        : <RefreshCw size={14} aria-label="Reintentar" />}
                                                    Reintentar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {estadosAsistencia.map((estado) => (
                    <article key={estado.valor} className="tarjeta" style={{ background: estado.colorFondo }}>
                        <p className="text-sm text-texto-secundario">{estado.valor}</p>
                        <p className={`mt-2 font-mono text-2xl ${estado.colorTexto}`}>
                            {(conteo[estado.valor] || 0).toLocaleString('es-CO')}
                        </p>
                    </article>
                ))}
            </div>

            <section className="tarjeta p-0">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-medium">Listado de estudiantes</h3>
                    <button
                        type="button"
                        onClick={manejarGuardarAsistencia}
                        disabled={guardando || estudiantes.length === 0 || !fechaValida || sinMateriaParaElDia}
                        className="boton-primario inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        title={!fechaValida ? "Solo puedes editar fechas de hoy o hasta 5 días atrás" : ""}
                    >
                        {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar
                    </button>
                </div>

                {cargando ? (
                    <p className="p-6 text-sm text-texto-secundario">Cargando...</p>
                ) : !cursoSeleccionado ? (
                    <div className="p-6 text-center">
                        <p className="text-texto-secundario">Selecciona una materia en el menú superior.</p>
                    </div>
                ) : sinMateriaParaElDia ? (
                    <div className="p-6 text-center">
                        <p className="text-texto-secundario">
                            No hay clases asignadas para el día <strong>{diaDeFecha}</strong>.
                        </p>
                        <p className="mt-1 text-xs text-texto-secundario">Seleccione una fecha correspondiente a los días de clase.</p>
                    </div>
                ) : estudiantes.length === 0 ? (
                    <p className="p-6 text-sm text-texto-secundario">No hay estudiantes para los filtros seleccionados.</p>
                ) : (
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-sm">
                            <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                <tr className="text-left text-texto-secundario">
                                    <th className="px-4 py-3 font-medium">Nombre</th>
                                    <th className="px-4 py-3 font-medium">ID</th>
                                    <th className="px-4 py-3 text-right font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estudiantes.map((estudiante) => (
                                    <tr key={estudiante.id} className="border-b">
                                        <td className="px-4 py-3 font-medium text-texto">{mostrarNombreOriginal(estudiante.name)}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-texto-secundario">{estudiante.id}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {estadosAsistencia.map((estado) => {
                                                    const Icono = estado.icono;
                                                    const activo = asistencia[estudiante.id] === estado.valor;
                                                    return (
                                                        <button
                                                            key={estado.valor}
                                                            type="button"
                                                            onClick={() => cambiarEstado(estudiante.id, estado.valor)}
                                                            className={`inline-flex items-center gap-1 rounded-[var(--badge-radius)] border px-3 py-1 text-xs font-semibold ${activo ? estado.colorTexto : 'text-texto-secundario'
                                                                }`}
                                                            style={{
                                                                background: activo ? estado.colorFondo : 'var(--color-surface)',
                                                            }}
                                                        >
                                                            <Icono size={14} />
                                                            {estado.valor}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="divide-y md:hidden">
                        {estudiantes.map((estudiante) => (
                            <article key={estudiante.id} className="space-y-3 px-4 py-4">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    <p className="min-w-0 break-words font-medium text-texto">
                                        {mostrarNombreOriginal(estudiante.name)}
                                    </p>
                                    <span className="shrink-0 font-mono text-xs text-texto-secundario">{estudiante.id}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {estadosAsistencia.map((estado) => {
                                        const Icono = estado.icono;
                                        const activo = asistencia[estudiante.id] === estado.valor;
                                        return (
                                            <button
                                                key={estado.valor}
                                                type="button"
                                                onClick={() => cambiarEstado(estudiante.id, estado.valor)}
                                                className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-[var(--badge-radius)] border px-1.5 py-2 text-xs font-semibold ${activo ? estado.colorTexto : 'text-texto-secundario'}`}
                                                style={{ background: activo ? estado.colorFondo : 'var(--color-surface)' }}
                                            >
                                                <Icono size={14} />
                                                <span className="truncate">{estado.valor}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}
