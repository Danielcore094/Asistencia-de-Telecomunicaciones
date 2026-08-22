import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const tiempoInactividad = Math.max(1, Number(import.meta.env.VITE_TIEMPO_INACTIVIDAD_MINUTOS) || 30) * 60 * 1000;

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        localStorage.removeItem('token');
        if (token) {
            api.get('/autenticacion/yo')
                .then(res => setUsuario(res.data))
                .catch(() => { sessionStorage.removeItem('token'); })
                .finally(() => setCargando(false));
        } else {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (!usuario) return undefined;

        let temporizador;
        const cerrarPorInactividad = () => {
            sessionStorage.removeItem('token');
            setUsuario(null);
            window.location.href = '/login';
        };
        const reiniciarTemporizador = () => {
            window.clearTimeout(temporizador);
            temporizador = window.setTimeout(cerrarPorInactividad, tiempoInactividad);
        };
        const eventosActividad = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

        eventosActividad.forEach(evento => window.addEventListener(evento, reiniciarTemporizador, { passive: true }));
        reiniciarTemporizador();

        return () => {
            window.clearTimeout(temporizador);
            eventosActividad.forEach(evento => window.removeEventListener(evento, reiniciarTemporizador));
        };
    }, [usuario, tiempoInactividad]);

    const iniciarSesion = (token, datosDocente) => {
        sessionStorage.setItem('token', token);
        setUsuario(datosDocente);
    };

    const cerrarSesion = () => {
        sessionStorage.removeItem('token')
        localStorage.removeItem('selectedCourseId')
        localStorage.removeItem('selectedGroup')
        localStorage.removeItem('selectedCode')
        localStorage.removeItem('selectedDocente')
        setUsuario(null)
    };

    return (
        <ContextoAutenticacion.Provider value={{ usuario, iniciarSesion, cerrarSesion, cargando }}>
            {children}
        </ContextoAutenticacion.Provider>
    );
}

export function useAutenticacion() {
    return useContext(ContextoAutenticacion);
}
