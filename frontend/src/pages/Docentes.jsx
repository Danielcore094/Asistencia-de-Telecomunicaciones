import { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, Trash2, Loader2, Users, Eye, EyeOff, ShieldCheck, Send, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Docentes() {
    const { usuario } = useAutenticacion();
    const [profesores, setProfesores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [formulario, setFormulario] = useState({ documento: '', nombre: '', correo: '', password: '', role: 'TEACHER' });
    const [eliminandoId, setEliminandoId] = useState(null);
    const [editandoId, setEditandoId] = useState(null);
    const [enviandoNotificaciones, setEnviandoNotificaciones] = useState(false);

    useEffect(() => { obtenerProfesores(); }, []);

    const obtenerProfesores = async () => {
        try {
            const datos = await api.get('/docentes').then(r => r.data);
            setProfesores(datos);
        } catch {
            toast.error('Error al cargar profesores');
        } finally {
            setCargando(false);
        }
    };

    const manejarEnvioNotificaciones = async () => {
        if (!confirm('¿Deseas enviar las notificaciones de inasistencias a todos los estudiantes con faltas esta semana?')) return;

        setEnviandoNotificaciones(true);
        const toastId = toast.loading('Procesando envío de correos...');

        try {
            const res = await api.post('/notificaciones/enviar-semanal');
            const { results } = res.data;
            toast.success(
                `Proceso completado: ${results.sent} enviados, ${results.skipped} omitidos.`,
                { id: toastId, duration: 5000 }
            );
        } catch (err) {
            toast.error(
                err.response?.data?.error || 'Error al ejecutar el proceso de notificación',
                { id: toastId }
            );
        } finally {
            setEnviandoNotificaciones(false);
        }
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            if (editandoId) {
                // Actualizar docente existente
                const res = await api.put(`/docentes/${editandoId}`, formulario);
                setProfesores(prev => prev.map(p => p.id === editandoId ? res.data : p));
                toast.success('Docente actualizado correctamente');
                cancelarEdicion();
            } else {
                // Crear nuevo docente
                const nuevoProfesor = await api.post('/docentes', formulario).then(r => r.data);
                setProfesores(prev => [...prev, nuevoProfesor]);
                setFormulario({ documento: '', nombre: '', correo: '', password: '', role: 'TEACHER' });
                toast.success('Docente creado correctamente');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || `Error al ${editandoId ? 'actualizar' : 'crear'} docente`);
        } finally {
            setGuardando(false);
        }
    };

    const iniciarEdicion = (profesor) => {
        setEditandoId(profesor.id);
        setFormulario({
            documento: profesor.id,
            nombre: profesor.name,
            correo: profesor.email,
            password: '', // Contraseña opcional en edición
            role: profesor.role
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setFormulario({ documento: '', name: '', email: '', password: '', role: 'TEACHER' });
    };

    const manejarEliminacion = async (id, nombre) => {
        if (id === usuario?.id) {
            toast.error('No puedes eliminar tu propia cuenta');
            return;
        }
        if (!confirm(`¿Eliminar al docente "${nombre}"? Esta acción no se puede deshacer.`)) return;
        setEliminandoId(id);
        try {
            await api.delete(`/docentes/${id}`);
            setProfesores(prev => prev.filter(p => p.id !== id));
            toast.success('Docente eliminado');
        } catch {
            toast.error('Error al eliminar docente');
        } finally {
            setEliminandoId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Gestión de Docentes</h1>
                <p className="text-gray-500 mt-1">Administra las cuentas de acceso al sistema</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Formulario de creación */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 self-start">
                    <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                        {editandoId ? <Pencil size={20} className="text-amber-600" /> : <UserPlus size={20} className="text-brand-purple" />}
                        {editandoId ? 'Editar Docente' : 'Crear Nuevo Docente'}
                    </h2>
                    <form onSubmit={manejarEnvio} className="space-y-4">
                        {!editandoId && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Documento / ID</label>
                                <input
                                    type="text"
                                    value={formulario.documento}
                                    onChange={e => setFormulario(p => ({ ...p, documento: e.target.value }))}
                                    placeholder="Ej. 1098765432"
                                    required
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Nombre completo</label>
                            <input
                                type="text"
                                value={formulario.nombre}
                                onChange={e => setFormulario(p => ({ ...p, nombre: e.target.value }))}
                                placeholder="Ej. Juan Pérez"
                                required
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Correo Electrónico</label>
                            <input
                                type="email"
                                value={formulario.correo}
                                onChange={e => setFormulario(p => ({ ...p, correo: e.target.value }))}
                                placeholder="correo@ejemplo.com"
                                required
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                                Contraseña {editandoId && <span className="text-[10px] font-normal text-gray-400">(deja en blanco para no cambiar)</span>}
                            </label>
                            <div className="relative">
                                <input
                                    type={mostrarContrasena ? 'text' : 'password'}
                                    value={formulario.password}
                                    onChange={e => setFormulario(p => ({ ...p, password: e.target.value }))}
                                    placeholder={editandoId ? "Nueva contraseña" : "Mínimo 8 caracteres"}
                                    required={!editandoId}
                                    minLength={8}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-11 text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarContrasena(p => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Rol del Sistema</label>
                            <select
                                value={formulario.role}
                                onChange={e => setFormulario(p => ({ ...p, role: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 bg-white outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition"
                            >
                                <option value="TEACHER">Profesor (Solo sus materias)</option>
                                <option value="ADMIN">Administrador (Gestión total)</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={cancelarEdicion}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
                                >
                                    <X size={18} />
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={guardando}
                                className={`flex-[2] flex items-center justify-center gap-2 ${editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-purple hover:bg-purple-700'} text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 transform hover:-translate-y-0.5`}
                            >
                                {guardando ? <Loader2 size={18} className="animate-spin" /> : (editandoId ? <Pencil size={18} /> : <UserPlus size={18} />)}
                                {guardando ? (editandoId ? 'Actualizando...' : 'Creando...') : (editandoId ? 'Actualizar Docente' : 'Crear Docente')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Panel de acciones del sistema (solo ADMIN) */}
                {usuario?.role === 'ADMIN' && (
                    <div className="lg:col-span-2 bg-gradient-to-br from-brand-purple to-purple-800 rounded-2xl shadow-lg border border-purple-700/50 p-6 self-start text-white">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <ShieldCheck size={20} />
                            Acciones del Sistema
                        </h2>
                        <p className="text-purple-100 text-sm mb-6 leading-relaxed">
                            Control manual de las tareas automáticas del servidor.
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={manejarEnvioNotificaciones}
                                disabled={enviandoNotificaciones}
                                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
                            >
                                {enviandoNotificaciones ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {enviandoNotificaciones ? 'Enviando...' : 'Enviar Reportes Semanales Ahora'}
                            </button>
                            <p className="text-[10px] text-purple-200/70 text-center italic">
                                * Esto enviará correos solo a estudiantes con faltas que NO hayan recibido el correo esta semana.
                            </p>
                        </div>
                    </div>
                )}

                {/* Listado de profesores */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 font-bold text-gray-700 border-b flex items-center gap-2">
                        <Users size={18} />
                        Docentes Registrados
                        <span className="ml-auto bg-brand-purple/10 text-brand-purple text-xs font-bold px-2.5 py-1 rounded-full">
                            {profesores.length}
                        </span>
                    </div>

                    {cargando ? (
                        <div className="flex justify-center p-16"><Loader2 className="animate-spin text-brand-purple" size={36} /></div>
                    ) : profesores.length === 0 ? (
                        <div className="text-center p-16 text-gray-400 font-medium">No hay profesores registrados aún.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {profesores.map(profesor => (
                                <div key={profesor.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {profesor.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-semibold text-gray-800">{profesor.name}</p>
                                                {profesor.role === 'ADMIN' && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                        <ShieldCheck size={11} /> Admin
                                                    </span>
                                                )}
                                                {profesor.id === usuario?.id && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">
                                                        Tú
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{profesor.email}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Registrado {format(parseISO(profesor.createdAt), "d MMM yyyy", { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {usuario?.role === 'ADMIN' && (
                                            <button
                                                onClick={() => iniciarEdicion(profesor)}
                                                className="p-2 rounded-xl text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all"
                                                title="Editar profesor"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => manejarEliminacion(profesor.id, profesor.name)}
                                            disabled={eliminandoId === profesor.id || profesor.id === usuario?.id}
                                            className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={profesor.id === usuario?.id ? 'No puedes eliminar tu propia cuenta' : 'Eliminar profesor'}
                                        >
                                            {eliminandoId === profesor.id
                                                ? <Loader2 size={18} className="animate-spin" />
                                                : <Trash2 size={18} />
                                            }
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
