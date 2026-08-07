import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, ArrowLeft, Send } from 'lucide-react';

export default function RecuperarContrasena() {
    const [correo, setCorreo] = useState('');
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);
    const [cargando, setCargando] = useState(false);
    const navegar = useNavigate();

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setError('');
        setExito(false);
        setCargando(true);
        try {
            // El endpoint que hemos creado en backend
            await api.post('/autenticacion/recuperar-contrasena', { email: correo });
            setExito(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al enviar el correo. Intenta de nuevo.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F0EBE1] p-4">
            <div className="w-full max-w-md -mt-16">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
                    <button
                        onClick={() => navegar('/login')}
                        className="flex items-center text-slate-500 hover:text-slate-700 transition mb-6"
                    >
                        <ArrowLeft size={18} className="mr-1" /> Volver al inicio de sesión
                    </button>

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Recuperar Contraseña</h2>
                    <p className="text-slate-600 mb-6 text-sm">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </p>

                    {exito ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-5 rounded-xl text-center">
                            <p className="font-semibold mb-2">¡Correo enviado!</p>
                            <p className="text-sm">Si tu correo está registrado, recibirás un enlace de recuperación en los próximos minutos.</p>
                        </div>
                    ) : (
                        <form onSubmit={manejarEnvio} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={correo}
                                    onChange={e => setCorreo(e.target.value)}
                                    placeholder="tu@correo.edu"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={cargando}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {cargando ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Send size={20} />
                                )}
                                {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
