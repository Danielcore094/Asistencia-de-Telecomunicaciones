import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import api from '../services/api';
import { enviarNotificacionesSemanal, obtenerEstadoNotificaciones, obtenerEstadoWhatsApp, obtenerCursos } from '../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff, Trash2, Loader2, X, Mail, Send, CheckCircle2, AlertCircle, Clock, MessageSquare, Smartphone, Pencil, Key } from 'lucide-react';

const renderizarHorario = (horario) => {
    if (!horario) return 'No registrado';

    return horario.split('|').map((sesion, indice) => {
        const [dia, ...horas] = sesion.split(':');
        return (
            <span key={`${sesion}-${indice}`} className="block whitespace-nowrap">
                {dia}: {horas.join(':')}
            </span>
        );
    });
};

export default function Configuracion() {
    const { usuario } = useAutenticacion();
    const [docentes, setDocentes] = useState([]);
    const [totalMateriasActivas, setTotalMateriasActivas] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [formulario, setFormulario] = useState({ documento: '', name: '', email: '', password: '', role: 'TEACHER' });
    const [eliminandoId, setEliminandoId] = useState(null);
    const [editandoId, setEditandoId] = useState(null);
    const [modalFormularioVisible, setModalFormularioVisible] = useState(false);
    const [modoCambioContrasena, setModoCambioContrasena] = useState(false);


    const [enviandoNotificaciones, setEnviandoNotificaciones] = useState(false);
    const [resultadoNotificaciones, setResultadoNotificaciones] = useState(null);
    const [estadoCron, setEstadoCron] = useState(null);
    const [modalCorreoVisible, setModalCorreoVisible] = useState(false);
    const [cargandoCorreo, setCargandoCorreo] = useState(false);
    const [errorCorreo, setErrorCorreo] = useState(false);


    const [estadoWhatsApp, setEstadoWhatsApp] = useState(null);
    const [cargandoWa, setCargandoWa] = useState(false);
    const [modalWaVisible, setModalWaVisible] = useState(false);
    const [errorWa, setErrorWa] = useState(false);

    const cargarHistorialCorreo = async () => {
        setModalCorreoVisible(true);
        setCargandoCorreo(true);
        setErrorCorreo(false);
        try {
            const estado = await obtenerEstadoNotificaciones();
            setEstadoCron(estado);
        } catch (_) {
            setErrorCorreo(true);
        } finally {
            setCargandoCorreo(false);
        }
    };

    const cargarHistorialWhatsApp = async () => {
        setModalWaVisible(true);
        setCargandoWa(true);
        setErrorWa(false);
        try {
            const data = await obtenerEstadoWhatsApp(200);
            setEstadoWhatsApp(data);
        } catch (_) {
            setErrorWa(true);
        } finally {
            setCargandoWa(false);
        }
    };

    const isPasswordValid = useMemo(() => {
        const p = formulario.password;
        return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
    }, [formulario.password]);

    if (usuario?.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        const cargarDocentes = async () => {
            try {
                const respuesta = await api.get('/docentes').then((r) => r.data);
                const listaDocentes = Array.isArray(respuesta)
                    ? respuesta
                    : Array.isArray(respuesta?.teachers)
                        ? respuesta.teachers
                        : Array.isArray(respuesta?.users)
                            ? respuesta.users
                            : Array.isArray(respuesta?.docentes)
                                ? respuesta.docentes
                                : [];
                setDocentes(listaDocentes);
            } catch (_error) {
                setDocentes([]);
            } finally {
                setCargando(false);
            }
        };
        const cargarEstadoCron = async () => {
            try {
                const estado = await obtenerEstadoNotificaciones();
                setEstadoCron(estado);
            } catch (_) {
            }
        };
        const cargarTotalMaterias = async () => {
            try {
                const todasLasMaterias = await obtenerCursos();
                setTotalMateriasActivas(Array.isArray(todasLasMaterias) ? todasLasMaterias.length : 0);
            } catch (_) {
                setTotalMateriasActivas(0);
            }
        };

        cargarDocentes();
        cargarEstadoCron();
        cargarTotalMaterias();
    }, []);

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            if (editandoId) {
                const payload = modoCambioContrasena ? { password: formulario.password } : formulario;
                const res = await api.put(`/docentes/${editandoId}`, payload);
                setDocentes(prev => prev.map(p => p.id === editandoId ? res.data : p));
                toast.success(modoCambioContrasena ? 'Contraseña actualizada exitosamente' : 'Usuario actualizado exitosamente');
                cancelarEdicion();
            } else {
                const nuevoProfesor = await api.post('/docentes', formulario).then(r => r.data);
                setDocentes(prev => [...prev, nuevoProfesor]);
                setFormulario({ documento: '', name: '', email: '', password: '', role: 'TEACHER' });
                setModalFormularioVisible(false);
                toast.success('Usuario creado exitosamente');
                if (nuevoProfesor.warning) {
                    toast.error(nuevoProfesor.warning, { duration: 7000 });
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.error || `Error al ${editandoId ? 'actualizar' : 'crear'} usuario`);
        } finally {
            setGuardando(false);
        }
    };

    const iniciarEdicion = (docente) => {
        setEditandoId(docente.id);
        setFormulario({
            documento: docente.id,
            name: docente.name,
            email: docente.email,
            password: '',
            role: docente.role === 'DOCENTE' || docente.role === 'TEACHER' ? 'TEACHER' : docente.role
        });
        setModoCambioContrasena(false);
        setModalFormularioVisible(true);
    };

    const iniciarCambioContrasena = (docente) => {
        setEditandoId(docente.id);
        setFormulario({
            documento: docente.id,
            name: docente.name,
            email: docente.email,
            password: '',
            role: docente.role === 'DOCENTE' || docente.role === 'TEACHER' ? 'TEACHER' : docente.role
        });
        setModoCambioContrasena(true);
        setModalFormularioVisible(true);
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setModoCambioContrasena(false);
        setFormulario({ documento: '', name: '', email: '', password: '', role: 'TEACHER' });
        setModalFormularioVisible(false);
    };

    const manejarEliminacion = async (id, nombre) => {
        if (id === usuario?.id) {
            toast.error('No puedes eliminar tu propia cuenta');
            return;
        }
        if (!confirm(`¿Eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
        setEliminandoId(id);
        try {
            await api.delete(`/docentes/${id}`);
            setDocentes(prev => prev.filter(p => p.id !== id));
            toast.success('Usuario eliminado');
        } catch {
            toast.error('Error al eliminar usuario');
        } finally {
            setEliminandoId(null);
        }
    };

    return (
        <>
            <section className="space-y-6">
                <header className="tarjeta flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold">Configuración</h2>
                            <p className="mt-1 text-sm text-texto-secundario">Parámetros institucionales y datos de cuenta.</p>
                        </div>
                    </div>
                </header>

                <section className="grid gap-4 lg:grid-cols-3">
                    <article className="tarjeta lg:col-span-1">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-medium">Institución</h3>
                        </div>
                        <div className="mt-4 grid gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-texto-secundario">Nombre institucional</p>
                                    <p className="font-semibold text-base">Unidades Tecnológicas de Santander</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-texto-secundario">Aplicación</p>
                                    <p className="font-medium">Control de Asistencia Telecomunicaciones</p>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="tarjeta lg:col-span-1">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-medium">Configuración de horario</h3>
                        </div>
                        <div className="mt-4 grid gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-texto-secundario">Materias activas de todos los docentes</p>
                                    <div className="inline-flex items-center gap-3">
                                        <div className="rounded-md px-3 py-1 bg-acento/10 border border-acento/20">
                                            <span className="font-semibold text-lg text-acento">{totalMateriasActivas.toLocaleString('es-CO')}</span>
                                        </div>
                                        <p className="text-sm text-texto-secundario">Total general del sistema</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-texto-secundario">Última revisión</p>
                                    <p className="font-medium">{new Date().toLocaleDateString('es-CO')}</p>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="tarjeta lg:col-span-1">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-medium">Información de cuenta</h3>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-primario/10 flex items-center justify-center text-primario font-semibold text-lg">
                                {usuario?.name ? usuario.name.split(' ').map(n => n[0]).slice(0,2).join('') : 'U'}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-texto-secundario">Nombre</p>
                                <p className="font-semibold">{usuario?.name || 'Sin nombre disponible'}</p>
                                <p className="mt-2 text-sm text-texto-secundario">Correo</p>
                                <p className="text-sm">{usuario?.email || 'Sin correo disponible'}</p>
                                <p className="mt-2 text-sm text-texto-secundario">Rol</p>
                                <p className="text-sm font-medium">{usuario?.role === 'ADMIN' ? 'Administrador' : 'Docente'}</p>
                            </div>
                        </div>
                    </article>
                </section>


                <section className="tarjeta">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Mail size={20} className="text-primario" aria-label="Notificaciones por correo" />
                                Notificaciones de Inasistencia
                            </h3>
                            <p className="mt-1 text-sm text-texto-secundario">
                                Envía correos automáticos a estudiantes con inasistencias registradas durante la semana actual (lunes a sábado).
                                El sistema evita duplicados: si ya fue notificado esta semana, no se reenvía.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs">
                                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-accent)' }}>
                                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                                    Cron activo — Estudiantes: domingos 09:00; docentes y administrador: lunes 06:00 (Bogotá)
                                </span>
                                {estadoCron?.ultimaEjecucion && (
                                    <span className="text-texto-secundario">
                                        Última ejecución: {new Date(estadoCron.ultimaEjecucion.fecha).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                )}
                                {estadoCron?.estadoSemanaActual && (
                                    <span className="text-texto-secundario">
                                        Esta semana: <strong>{estadoCron.estadoSemanaActual.correosEnviados}</strong> correo{estadoCron.estadoSemanaActual.correosEnviados !== 1 ? 's' : ''} enviado{estadoCron.estadoSemanaActual.correosEnviados !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={enviandoNotificaciones}
                            onClick={async () => {
                                setEnviandoNotificaciones(true);
                                setResultadoNotificaciones(null);
                                try {
                                    const resultado = await enviarNotificacionesSemanal();
                                    setResultadoNotificaciones(resultado.results);
                                    const estadoActualizado = await obtenerEstadoNotificaciones();
                                    setEstadoCron(estadoActualizado);
                                    toast.success(`Proceso completado: ${resultado.results.sent} correos enviados`);
                                } catch (err) {
                                    const msg = err?.response?.data?.error || 'Error al enviar notificaciones';
                                    toast.error(msg);
                                } finally {
                                    setEnviandoNotificaciones(false);
                                }
                            }}
                            className="boton-primario inline-flex items-center gap-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-label="Enviar notificaciones semanales"
                        >
                            {enviandoNotificaciones
                                ? <><Loader2 size={16} className="animate-spin" aria-label="Enviando" /> Enviando...</>
                                : <><Send size={16} aria-label="Enviar" /> Enviar notificaciones semanales</>}
                        </button>
                        <button
                            type="button"
                            onClick={cargarHistorialCorreo}
                            className="boton-secundario inline-flex items-center gap-2 shrink-0"
                            aria-label="Ver historial de correos"
                        >
                            <Mail size={16} aria-label="Ver historial de correos" /> Ver historial
                        </button>
                    </div>

                    {resultadoNotificaciones && (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-present) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-present) 25%, transparent)' }}>
                                <CheckCircle2 size={20} style={{ color: 'var(--color-present)', flexShrink: 0 }} />
                                <div>
                                    <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--color-present)' }}>{resultadoNotificaciones.sent}</p>
                                    <p className="text-xs text-texto-secundario">Enviados</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-muted) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-muted) 25%, transparent)' }}>
                                <Clock size={20} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                                <div>
                                    <p className="font-mono text-2xl font-semibold text-texto-secundario">{resultadoNotificaciones.skipped}</p>
                                    <p className="text-xs text-texto-secundario">Omitidos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-absent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-absent) 25%, transparent)' }}>
                                <AlertCircle size={20} style={{ color: 'var(--color-absent)', flexShrink: 0 }} />
                                <div>
                                    <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--color-absent)' }}>{resultadoNotificaciones.errors}</p>
                                    <p className="text-xs text-texto-secundario">Errores</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {resultadoNotificaciones?.details?.length > 0 && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[500px] text-sm">
                                <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                    <tr className="text-left text-texto-secundario">
                                        <th className="px-4 py-2 font-medium">Estudiante</th>
                                        <th className="px-4 py-2 font-medium">Correo</th>
                                        <th className="px-4 py-2 font-medium text-center">Estado</th>
                                        <th className="px-4 py-2 font-medium">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultadoNotificaciones.details.map((d, i) => (
                                        <tr key={i} className="tabla-fila">
                                            <td className="px-4 py-2 font-medium">{d.studentName}</td>
                                            <td className="px-4 py-2 text-texto-secundario text-xs">{d.email || '—'}</td>
                                            <td className="px-4 py-2 text-center">
                                                {d.status === 'SUCCESS' && <span className="badge-docente">Enviado</span>}
                                                {d.status === 'SKIPPED' && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--badge-radius)', fontSize: '0.75rem', fontWeight: 600, background: 'color-mix(in srgb, var(--color-muted) 15%, transparent)', color: 'var(--color-muted)' }}>Omitido</span>}
                                                {d.status === 'ERROR' && <span className="badge-admin">Error</span>}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-texto-secundario">{d.reason || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {modalCorreoVisible && (
                    <div
                        className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(51, 51, 71, 0.65)', backdropFilter: 'blur(3px)' }}
                        onClick={(e) => { if (e.target === e.currentTarget) setModalCorreoVisible(false); }}
                    >
                        <div
                            className="modal-panel w-full flex flex-col"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--card-radius)', width: 'calc(100vw - 24px)', maxWidth: '1400px', maxHeight: '88vh' }}
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Mail size={20} className="text-primario" /> Historial de correos de inasistencia
                                </h3>
                                <button type="button" onClick={() => setModalCorreoVisible(false)} className="p-1.5 rounded-md" style={{ color: 'var(--color-muted)' }} aria-label="Cerrar historial de correos">
                                    <X size={20} aria-label="Cerrar" />
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1 overflow-x-auto">
                                {cargandoCorreo ? (
                                    <p className="py-12 text-center text-texto-secundario text-sm">Cargando historial...</p>
                                ) : errorCorreo ? (
                                    <p className="py-12 text-center text-texto-secundario text-sm">No se pudo cargar el historial de correos.</p>
                                ) : !estadoCron?.historial?.length ? (
                                    <p className="py-12 text-center text-texto-secundario text-sm">No hay notificaciones de correo registradas aún.</p>
                                ) : (
                                    <table className="min-w-[1100px] w-full table-auto whitespace-nowrap text-sm">
                                        <thead className="sticky top-0" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', zIndex: 1 }}>
                                            <tr className="text-left text-texto-secundario">
                                                <th className="px-5 py-3 font-medium">Estudiante</th>
                                                <th className="px-5 py-3 font-medium">Documento</th>
                                                <th className="px-3 py-3 font-medium">Correo utilizado</th>
                                                <th className="px-5 py-3 font-medium">Semana</th>
                                                <th className="px-5 py-3 font-medium">Fecha</th>
                                                <th className="px-5 py-3 font-medium text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {estadoCron.historial.map((registro) => (
                                                <tr key={registro.id} className="tabla-fila">
                                                    <td className="px-5 py-2.5 font-medium">{registro.estudiante}</td>
                                                    <td className="px-5 py-2.5 font-mono text-xs text-texto-secundario">{registro.documento}</td>
                                                    <td className="px-3 py-2.5 text-texto-secundario">{registro.correo || 'No registrado'}</td>
                                                    <td className="px-5 py-2.5 text-texto-secundario">{registro.semana}</td>
                                                    <td className="px-5 py-2.5 text-xs text-texto-secundario">{new Date(registro.fecha).toLocaleString('es-CO')}</td>
                                                    <td className="px-5 py-2.5 text-center">
                                                        {registro.estado === 'SUCCESS' && <span className="badge-docente">Enviado</span>}
                                                        {registro.estado === 'SKIPPED' && <span className="text-xs text-texto-secundario">Omitido</span>}
                                                        {registro.estado === 'ERROR' && <span className="badge-admin" title={registro.error || 'Error de envío'}>Error</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                                <p className="text-xs text-texto-secundario">Mostrando {estadoCron?.historial?.length || 0} registros más recientes</p>
                                <button type="button" onClick={() => setModalCorreoVisible(false)} className="boton-secundario text-sm px-4 py-1.5">Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

                <section className="tarjeta">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <MessageSquare size={20} className="text-primario" />
                                Notificaciones por WhatsApp
                            </h3>
                            <p className="mt-1 text-sm text-texto-secundario">
                                Cada vez que un docente guarda asistencia con estudiantes ausentes, el sistema
                                envía automáticamente un mensaje de WhatsApp a través de Evolution API.
                                El envío es inmediato y no requiere acción manual.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs">
                                <span className="flex items-center gap-1.5" style={{ color: 'var(--color-accent)' }}>
                                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                                    Activo — disparo automático al guardar asistencia
                                </span>
                                {estadoWhatsApp?.resumen && (
                                    <span className="text-texto-secundario">
                                        Total enviados: <strong>{estadoWhatsApp.resumen.enviados}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={cargandoWa}
                            onClick={cargarHistorialWhatsApp}
                            className="boton-secundario inline-flex items-center gap-2 shrink-0"
                            aria-label="Ver historial WhatsApp"
                        >
                            {cargandoWa
                                ? <><Loader2 size={16} className="animate-spin" aria-label="Cargando" /> Cargando...</>
                                : <><Smartphone size={16} aria-label="Ver historial" /> Ver historial</>}
                        </button>
                    </div>
                </section>

                <section className="tarjeta p-0">
                    <div className="border-b px-6 py-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium">Usuarios Registrados</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setEditandoId(null);
                                setModoCambioContrasena(false);
                                setFormulario({ documento: '', name: '', email: '', password: '', role: 'TEACHER' });
                                setModalFormularioVisible(true);
                            }}
                            className="boton-primario inline-flex items-center gap-2 h-[38px]"
                            aria-label="Nuevo usuario"
                        >
                            <UserPlus size={16} aria-label="Nuevo usuario" />
                            Nuevo Usuario
                        </button>
                    </div>
                    {cargando ? (
                        <p className="p-6 text-sm text-texto-secundario">Cargando...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-sm">
                                <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                    <tr className="text-left text-texto-secundario">
                                        <th className="px-4 py-3 font-medium">Documento</th>
                                        <th className="px-4 py-3 font-medium">Nombre</th>
                                        <th className="px-4 py-3 font-medium">Correo</th>
                                        <th className="px-4 py-3 font-medium">Rol</th>
                                        <th className="px-4 py-3 font-medium text-center">Registro</th>
                                        <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {docentes.map((docente) => (
                                        <tr key={docente.id} className="tabla-fila">
                                            <td className="px-4 py-3 font-mono text-xs text-texto-secundario">{docente.id}</td>
                                            <td className="px-4 py-3 font-medium text-texto">{docente.name}</td>
                                            <td className="px-4 py-3 text-texto-secundario text-sm">{docente.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={docente.role === 'ADMIN' ? 'badge-admin' : 'badge-docente'}>
                                                    {docente.role === 'ADMIN' ? 'Administrador' : docente.role === 'DOCENTE' || docente.role === 'TEACHER' ? 'Docente' : docente.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {new Date(docente.createdAt).toLocaleDateString('es-CO')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => iniciarEdicion(docente)}
                                                        className="p-1.5 text-texto-secundario hover:text-primario hover:bg-primario-light rounded-md transition-colors"
                                                        title="Editar usuario"
                                                        aria-label={`Editar usuario ${docente.name}`}
                                                    >
                                                        <Pencil size={16} aria-label="Editar usuario" />
                                                    </button>
                                                    <button
                                                        onClick={() => iniciarCambioContrasena(docente)}
                                                        className="p-1.5 text-texto-secundario hover:text-primario hover:bg-primario-light rounded-md transition-colors"
                                                        title="Cambiar contraseña"
                                                        aria-label={`Cambiar contraseña de ${docente.name}`}
                                                    >
                                                        <Key size={16} aria-label="Cambiar contraseña" />
                                                    </button>
                                                    {docente.id !== usuario?.id && (
                                                        <button
                                                            onClick={() => manejarEliminacion(docente.id, docente.name)}
                                                            disabled={eliminandoId === docente.id}
                                                            className="p-1.5 text-texto-secundario hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                                            title="Eliminar usuario"
                                                            aria-label={`Eliminar usuario ${docente.name}`}
                                                        >
                                                            {eliminandoId === docente.id ? <Loader2 size={16} className="animate-spin" aria-label="Eliminando" /> : <Trash2 size={16} aria-label="Eliminar usuario" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {docentes.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-texto-secundario">
                                                No hay docentes disponibles para esta cuenta.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {modalFormularioVisible && (
                    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(2px)' }}>
                        <div className="modal-panel w-full max-w-4xl rounded-[var(--card-radius)] border flex flex-col" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '90vh' }}>
                            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    {modoCambioContrasena ? <Key size={20} className="text-primario" /> : editandoId ? <Pencil size={20} className="text-primario" /> : <UserPlus size={20} className="text-primario" />}
                                    {modoCambioContrasena ? 'Cambiar contraseña' : editandoId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                                </h3>
                                <button type="button" onClick={cancelarEdicion} disabled={guardando} className="p-1.5 rounded-md disabled:opacity-50" style={{ color: 'var(--color-muted)' }} aria-label="Cerrar modal">
                                    <X size={20} aria-label="Cerrar" />
                                </button>
                            </div>
                            <div className="overflow-auto flex-1 px-6 py-4">
                                <form onSubmit={manejarEnvio} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
                                    <div className="space-y-4">
                                        {!modoCambioContrasena && !editandoId && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Documento</label>
                                                <input
                                                    type="text"
                                                    required
                                                    inputMode="numeric"
                                                    pattern="\d{6,10}"
                                                    minLength={6}
                                                    maxLength={10}
                                                    placeholder="Ej. 1098765432"
                                                    className="campo w-full"
                                                    value={formulario.documento}
                                                    onChange={(e) => setFormulario({ ...formulario, documento: e.target.value.replace(/\D/g, '') })}
                                                />
                                            </div>
                                        )}
                                        {!modoCambioContrasena && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Nombre completo</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Ej. Juan Pérez"
                                                    className="campo w-full"
                                                    value={formulario.name}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const capitalized = val ? val.charAt(0).toUpperCase() + val.slice(1) : '';
                                                        setFormulario({ ...formulario, name: capitalized });
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {modoCambioContrasena && (
                                            <div className="rounded-md border border-border bg-surface/80 p-4">
                                                <p className="text-sm text-texto-secundario">Este formulario sólo actualizará la contraseña del usuario seleccionado.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {!modoCambioContrasena && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Correo electrónico</label>
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="correo@ejemplo.com"
                                                    className="campo w-full"
                                                    value={formulario.email}
                                                    onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {(modoCambioContrasena || !editandoId) && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-texto-secundario">{modoCambioContrasena ? 'Nueva contraseña' : 'Contraseña'}</label>
                                                <div className="relative">
                                                    <input
                                                        type={mostrarContrasena ? 'text' : 'password'}
                                                        required
                                                        minLength={8}
                                                        placeholder="Mín. 8 caracteres"
                                                        className="campo w-full pr-10"
                                                        value={formulario.password}
                                                        onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-texto-secundario hover:text-texto"
                                                    >
                                                        {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                                {!isPasswordValid && formulario.password.length > 0 && (
                                                    <div className="mt-2 grid grid-cols-1 gap-1">
                                                        {[
                                                            { label: 'Mínimo 8 caracteres', check: (p) => p.length >= 8 },
                                                            { label: 'Al menos una mayúscula', check: (p) => /[A-Z]/.test(p) },
                                                            { label: 'Al menos un número', check: (p) => /[0-9]/.test(p) },
                                                            { label: 'Un carácter especial', check: (p) => /[^A-Za-z0-9]/.test(p) },
                                                        ].map((rule, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: rule.check(formulario.password) ? 'var(--color-present)' : 'var(--color-muted)' }}>
                                                                <div className={`w-1 h-1 rounded-full ${rule.check(formulario.password) ? 'bg-present' : 'bg-muted'}`} />
                                                                {rule.label}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col justify-end gap-4">
                                        {!modoCambioContrasena && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Rol del Sistema</label>
                                                <select
                                                    className="campo w-full"
                                                    value={formulario.role}
                                                    onChange={(e) => setFormulario({ ...formulario, role: e.target.value })}
                                                >
                                                    <option value="TEACHER">Docente</option>
                                                    <option value="ADMIN">Administrador</option>
                                                </select>
                                            </div>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={guardando || (modoCambioContrasena ? !isPasswordValid : (!editandoId && !isPasswordValid) || (editandoId && formulario.password && !isPasswordValid))}
                                            className="boton-primario w-full h-11 flex justify-center items-center gap-2 rounded-md transition-all active:scale-95"
                                        >
                                            {guardando ? <Loader2 size={16} className="animate-spin" /> : modoCambioContrasena ? <Key size={16} /> : (editandoId ? <Pencil size={16} /> : <UserPlus size={16} />)}
                                            {guardando ? 'Guardando...' : modoCambioContrasena ? 'Cambiar contraseña' : (editandoId ? 'Actualizar Usuario' : 'Crear Usuario')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </section>


            {
                modalWaVisible && (
                    <div
                        className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(51, 51, 71, 0.65)', backdropFilter: 'blur(3px)' }}
                        onClick={(e) => { if (e.target === e.currentTarget) setModalWaVisible(false); }}
                    >
                        <div
                            className="modal-panel w-full flex flex-col"
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--card-radius)',
                                width: 'calc(100vw - 24px)',
                                maxWidth: '1200px',
                                maxHeight: '88vh',
                            }}
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <MessageSquare size={20} className="text-primario" />
                                    Historial de notificaciones WhatsApp
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setModalWaVisible(false)}
                                    className="p-1.5 rounded-md transition-colors"
                                    style={{ color: 'var(--color-muted)' }}
                                    aria-label="Cerrar historial WhatsApp"
                                >
                                    <X size={20} aria-label="Cerrar" />
                                </button>
                            </div>

                            <div className="px-6 py-4 grid grid-cols-3 gap-3 shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-present) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-present) 25%, transparent)' }}>
                                    <CheckCircle2 size={20} style={{ color: 'var(--color-present)', flexShrink: 0 }} />
                                    <div>
                                        <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--color-present)' }}>{estadoWhatsApp?.resumen?.enviados || 0}</p>
                                        <p className="text-xs text-texto-secundario">Enviados</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-muted) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-muted) 25%, transparent)' }}>
                                    <Clock size={20} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                                    <div>
                                        <p className="font-mono text-2xl font-semibold text-texto-secundario">{estadoWhatsApp?.resumen?.omitidos || 0}</p>
                                        <p className="text-xs text-texto-secundario">Omitidos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-absent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-absent) 25%, transparent)' }}>
                                    <AlertCircle size={20} style={{ color: 'var(--color-absent)', flexShrink: 0 }} />
                                    <div>
                                        <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--color-absent)' }}>{estadoWhatsApp?.resumen?.errores || 0}</p>
                                        <p className="text-xs text-texto-secundario">Errores</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1">
                                {cargandoWa ? (
                                    <p className="py-12 text-center text-texto-secundario text-sm">Cargando historial...</p>
                                ) : errorWa ? (
                                    <p className="py-12 text-center text-texto-secundario text-sm">No se pudo cargar el historial de WhatsApp.</p>
                                ) : !estadoWhatsApp?.logs?.length ? (
                                    <p className="py-12 text-center text-texto-secundario text-sm">
                                        No hay notificaciones de WhatsApp registradas aún.
                                    </p>
                                ) : (
                                    <table className="w-full table-fixed text-sm">
                                        <thead className="sticky top-0" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', zIndex: 1 }}>
                                            <tr className="text-left text-texto-secundario">
                                                <th className="w-[22%] px-3 py-3 font-medium">Estudiante</th>
                                                <th className="w-[14%] pl-6 pr-3 py-3 font-medium">WhatsApp</th>
                                                <th className="w-[22%] px-3 py-3 font-medium">Materia</th>
                                                <th className="w-[25%] px-3 py-3 font-medium">Horario</th>
                                                <th className="w-[10%] px-3 py-3 font-medium relative -left-6">Fecha clase</th>
                                                <th className="w-[7%] px-3 py-3 font-medium text-center relative -left-6">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {estadoWhatsApp.logs.map((log) => (
                                                <tr key={log.id} className="tabla-fila">
                                                    <td className="px-3 py-2.5 font-medium break-words">{log.estudiante}</td>
                                                    <td className="pl-6 pr-3 py-2.5 font-mono text-xs text-texto-secundario break-words">{log.whatsapp}</td>
                                                    <td className="px-3 py-2.5 text-texto-secundario break-words">{log.materia}</td>
                                                    <td className="px-3 py-2.5 text-texto-secundario text-xs leading-5">{renderizarHorario(log.horario)}</td>
                                                    <td className="px-3 py-2.5 text-texto-secundario text-xs break-words relative -left-6">{log.fecha}</td>
                                                    <td className="px-3 py-2.5 text-center relative -left-6">
                                                        {log.status === 'SUCCESS' && <span className="badge-docente">Enviado</span>}
                                                        {log.status === 'SKIPPED' && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--badge-radius)', fontSize: '0.75rem', fontWeight: 600, background: 'color-mix(in srgb, var(--color-muted) 15%, transparent)', color: 'var(--color-muted)' }}>Omitido</span>}
                                                        {log.status === 'ERROR' && <span className="badge-admin" title={log.error}>Error</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                                <p className="text-xs text-texto-secundario">
                                    Mostrando {estadoWhatsApp?.logs?.length || 0} registro{estadoWhatsApp?.logs?.length !== 1 ? 's' : ''} más recientes
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setModalWaVisible(false)}
                                    className="boton-secundario text-sm px-4 py-1.5"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
}
