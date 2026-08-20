import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/autenticacion/yo')
                .then(res => setUsuario(res.data))
                .catch(() => { localStorage.removeItem('token'); })
                .finally(() => setCargando(false));
        } else {
            setCargando(false);
        }
    }, []);

    const iniciarSesion = (token, datosDocente) => {
        localStorage.setItem('token', token);
        setUsuario(datosDocente);
    };

    const cerrarSesion = () => {
        localStorage.removeItem('token')
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
