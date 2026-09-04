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
    const [desafioSegundoFactor, setDesafioSegundoFactor] = useState('');
    const [codigoSegundoFactor, setCodigoSegundoFactor] = useState('');
    const { iniciarSesion } = useAutenticacion();
    const navegar = useNavigate();

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setError('');
        setMostrarOlvido(false);
        if (desafioSegundoFactor) {
            setCargando(true);
            try {
                const res = await api.post('/autenticacion/verificar-segundo-factor', {
                    desafio: desafioSegundoFactor,
                    codigo: codigoSegundoFactor,
                });

                if (res.data.forcePasswordChange && res.data.forcePasswordChangeToken) {
                    toast.success('Debes cambiar tu contraseña inicial antes de continuar');
                    navegar(`/reset-password?token=${encodeURIComponent(res.data.forcePasswordChangeToken)}`);
                    return;
                }

                iniciarSesion(res.data.token, res.data.teacher);
                navegar('/');
            } catch (err) {
                setError(err.response?.data?.error || 'No fue posible verificar el código');
                setCodigoSegundoFactor('');
            } finally {
                setCargando(false);
            }
            return;
        }
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

            if (res.data.requiereSegundoFactor && res.data.desafio) {
                setDesafioSegundoFactor(res.data.desafio);
                setCodigoSegundoFactor('');
                return;
            }

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

    const volverAlInicioSesion = () => {
        setDesafioSegundoFactor('');
        setCodigoSegundoFactor('');
        setError('');
        setTokenCaptcha('');
        setVersionCaptcha(version => version + 1);
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
                    <h2 className="text-xl font-bold text-texto mb-2 text-center">
                        {desafioSegundoFactor ? 'Verificación en dos pasos' : 'Iniciar Sesión'}
                    </h2>
                    <p className="mb-6 text-center text-sm text-texto-secundario">
                        {desafioSegundoFactor
                            ? 'Ingresa el código de 6 dígitos enviado a tu correo institucional.'
                            : 'Usa tus credenciales institucionales para continuar.'}
                    </p>

                    <form onSubmit={manejarEnvio} className="space-y-5">
                        {!desafioSegundoFactor && <><div>
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
                        </div></>}

                        {desafioSegundoFactor && (
                            <div>
                                <label className="block text-sm font-semibold text-texto-secundario mb-2" htmlFor="codigo-segundo-factor">
                                    Código de verificación
                                </label>
                                <input
                                    id="codigo-segundo-factor"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    pattern="[0-9]{6}"
                                    value={codigoSegundoFactor}
                                    onChange={e => setCodigoSegundoFactor(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    required
                                    autoFocus
                                    className="w-full bg-slate-50 border border-borde rounded-xl px-4 py-3 text-center text-xl tracking-[0.35em] text-texto placeholder-slate-400 outline-none focus:ring-2 focus:ring-primario focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        {!desafioSegundoFactor && <CaptchaTurnstile
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
                        />}
                        {!desafioSegundoFactor && errorCaptcha && (
                            <p className="text-sm text-red-600">{errorCaptcha}</p>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={cargando || (desafioSegundoFactor ? codigoSegundoFactor.length !== 6 : !tokenCaptcha)}
                            className="w-full flex items-center justify-center gap-2 bg-primario hover:bg-opacity-90 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-primario/10 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {cargando ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <LogIn size={20} />
                            )}
                            {cargando ? (desafioSegundoFactor ? 'Verificando...' : 'Iniciando sesión...') : (desafioSegundoFactor ? 'Verificar código' : 'Entrar')}
                        </button>
                        {desafioSegundoFactor && (
                            <button
                                type="button"
                                onClick={volverAlInicioSesion}
                                disabled={cargando}
                                className="w-full text-sm font-medium text-primario hover:text-primario-oscuro disabled:opacity-50"
                            >
                                Volver al inicio de sesión
                            </button>
                        )}
                    </form>
                </div>

                <p className="text-center text-texto-secundario/60 text-xs mt-8">
                    Sistema de Control de Asistencia · Telecomunicaciones
                </p>
            </div>
        </div>
    );
}
