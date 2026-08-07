import { useState, useEffect } from 'react';
import { User, KeyRound, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import api from '../services/api';

export default function Perfil() {
    const { usuario, iniciarSesion } = useAutenticacion();
    const [nombre, setNombre] = useState('');
    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    useEffect(() => {
        if (usuario?.name) {
            setNombre(usuario.name);
        }
    }, [usuario]);

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setMensaje({ tipo: '', texto: '' });

        if (nuevaPassword && nuevaPassword !== confirmarPassword) {
            setMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
            return;
        }

        if (nuevaPassword && !passwordActual) {
            setMensaje({ tipo: 'error', texto: 'Debes ingresar tu contraseña actual para cambiarla.' });
            return;
        }

        try {
            setCargando(true);
            const payload = {
                name: nombre !== usuario.name ? nombre : undefined,
                currentPassword: passwordActual || undefined,
                newPassword: nuevaPassword || undefined
            };

            const respuesta = await api.put('/autenticacion/perfil', payload);

            if (respuesta.data.success) {
                setMensaje({ tipo: 'exito', texto: 'Perfil actualizado correctamente.' });
                
                // Si el nombre cambió, actualizamos el contexto (y localStorage si es necesario)
                if (payload.name) {
                    const token = localStorage.getItem('token');
                    iniciarSesion(token, { ...usuario, name: payload.name });
                }

                // Limpiar campos de contraseña
                setPasswordActual('');
                setNuevaPassword('');
                setConfirmarPassword('');
            }
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            setMensaje({
                tipo: 'error',
                texto: error.response?.data?.error || 'Ocurrió un error al actualizar el perfil.'
            });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primario">Mi Perfil</h1>
                    <p className="text-sm text-texto-secundario mt-1">
                        Actualiza tu información personal y contraseña.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-borde bg-superficie shadow-sm overflow-hidden">
                <form onSubmit={manejarEnvio} className="p-6 md:p-8 space-y-8">
                    
                    {/* Alerta de mensaje */}
                    {mensaje.texto && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${
                            mensaje.tipo === 'error' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-acento/10 text-acento border border-acento/20'
                        }`}>
                            {mensaje.tipo === 'error' ? (
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                            )}
                            <p className="text-sm font-medium">{mensaje.texto}</p>
                        </div>
                    )}

                    {/* Información Personal */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-primario flex items-center gap-2 border-b border-borde pb-2">
                            <User className="w-5 h-5 text-primario/70" />
                            Información Personal
                        </h2>
                        
                        <div className="grid gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-texto">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={usuario?.email || ''}
                                    disabled
                                    className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto-secundario cursor-not-allowed opacity-70"
                                    readOnly
                                />
                                <p className="text-xs text-texto-secundario">El correo no puede ser modificado.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-texto">
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto focus:border-primario focus:outline-none focus:ring-1 focus:ring-primario"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seguridad */}
                    <div className="space-y-4 pt-2">
                        <h2 className="text-lg font-semibold text-primario flex items-center gap-2 border-b border-borde pb-2">
                            <KeyRound className="w-5 h-5 text-primario/70" />
                            Seguridad (Opcional)
                        </h2>
                        <p className="text-sm text-texto-secundario mb-4">
                            Deja estos campos en blanco si no deseas cambiar tu contraseña.
                        </p>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-texto">
                                    Contraseña Actual
                                </label>
                                <input
                                    type="password"
                                    value={passwordActual}
                                    onChange={(e) => setPasswordActual(e.target.value)}
                                    className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto focus:border-primario focus:outline-none focus:ring-1 focus:ring-primario"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-texto">
                                    Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto focus:border-primario focus:outline-none focus:ring-1 focus:ring-primario"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-texto">
                                    Confirmar Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={confirmarPassword}
                                    onChange={(e) => setConfirmarPassword(e.target.value)}
                                    className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto focus:border-primario focus:outline-none focus:ring-1 focus:ring-primario"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={cargando}
                            className="boton-primario flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {cargando ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
