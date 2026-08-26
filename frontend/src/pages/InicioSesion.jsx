import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Loader2, LogIn } from 'lucide-react';
import CaptchaTurnstile from '../components/CaptchaTurnstile';

export default function InicioSesion() {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [mostrarOlvido, setMostrarOlvido] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [tokenCaptcha, setTokenCaptcha] = useState('');
    const [errorCaptcha, setErrorCaptcha] = useState('');
    const [versionCaptcha, setVersionCaptcha] = useState(0);
    const { iniciarSesion } = useAutenticacion();
    const navegar = useNavigate();

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setError('');
        setMostrarOlvido(false);
        if (!tokenCaptcha) {
            setError('Completa la verificación CAPTCHA para continuar');
            return;
        }
        setCargando(true);
        try {
            const res = await api.post('/autenticacion/iniciar-sesion', {
                email: correo,
                password: contrasena,
                captchaToken: tokenCaptcha,
            });

            if (res.data.forcePasswordChange && res.data.forcePasswordChangeToken) {
                toast.success('Debes cambiar tu contraseña inicial antes de continuar');
                navegar(`/reset-password?token=${encodeURIComponent(res.data.forcePasswordChangeToken)}`);
                return;
            }

            iniciarSesion(res.data.token, res.data.teacher);
            navegar('/');
        } catch (err) {
            const mensajeError = err.response?.data?.error || 'Error de conexión. Intenta de nuevo.';
            setError(mensajeError);
            if (mensajeError === 'Credenciales incorrectas') {
                setMostrarOlvido(true);
            }
            setTokenCaptcha('');
            setVersionCaptcha(version => version + 1);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-beige p-4">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center sm:mb-8">
                    <div className="flex justify-center mb-4">
                        <img 
                            src="/logo.png" 
                            alt="Logo UTS" 
                            className="h-40 w-auto max-w-full object-contain drop-shadow-sm sm:h-56"
                        />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-texto tracking-tight mt-0">
                        Control de Asistencia<br/>Telecomunicaciones
                    </h1>
                    <p className="text-texto-secundario mt-2 font-medium text-sm">
                        Portal para docentes
                    </p>
                </div>

                <div className="bg-white border border-borde rounded-3xl p-6 sm:p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-texto mb-6 text-center">Iniciar Sesión</h2>

                    <form onSubmit={manejarEnvio} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-texto-secundario mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                value={correo}
                                onChange={e => setCorreo(e.target.value)}
                                placeholder="tu@correo.edu"
                                required
                                className="w-full bg-slate-50 border border-borde rounded-xl px-4 py-3 text-texto placeholder-slate-400 outline-none focus:ring-2 focus:ring-primario focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-texto-secundario mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={contrasena}
                                onChange={e => setContrasena(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full bg-slate-50 border border-borde rounded-xl px-4 py-3 text-texto placeholder-slate-400 outline-none focus:ring-2 focus:ring-primario focus:border-transparent transition-all"
                            />
                            {mostrarOlvido && (
                                <div className="mt-2 text-right">
                                    <a 
                                        href="/forgot-password" 
                                        className="text-sm text-primario hover:text-primario-oscuro font-medium transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                            )}
                        </div>

                        <CaptchaTurnstile
                            key={versionCaptcha}
                            alVerificar={token => {
                                setTokenCaptcha(token);
                                setErrorCaptcha('');
                            }}
                            alExpirar={() => setTokenCaptcha('')}
                            alError={mensaje => {
                                setTokenCaptcha('');
                                setErrorCaptcha(mensaje);
                            }}
                        />
                        {errorCaptcha && (
                            <p className="text-sm text-red-600">{errorCaptcha}</p>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={cargando || !tokenCaptcha}
                            className="w-full flex items-center justify-center gap-2 bg-primario hover:bg-opacity-90 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-primario/10 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {cargando ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <LogIn size={20} />
                            )}
                            {cargando ? 'Iniciando sesión...' : 'Entrar'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-texto-secundario/60 text-xs mt-8">
                    Sistema de Control de Asistencia · Telecomunicaciones
                </p>
            </div>
        </div>
    );
}
