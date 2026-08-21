import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { obtenerCursos } from '../services/api';
import { useAutenticacion } from './ContextoAutenticacion';
import toast from 'react-hot-toast';

const ContextoCurso = createContext(null);

export const ProveedorCurso = ({ children }) => {
    const { usuario } = useAutenticacion();
    const [cursos, setCursos] = useState([]);
    const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
    const [cargandoCursos, setCargandoCursos] = useState(true);


    const [grupoSeleccionado, setGrupoSeleccionado] = useState(
        () => localStorage.getItem('selectedGroup') || null
    );
    const [codigoSeleccionado, setCodigoSeleccionado] = useState(
        () => localStorage.getItem('selectedCode') || null
    );
    const [docenteSeleccionado, setDocenteSeleccionado] = useState(() => {
        const guardado = localStorage.getItem('selectedDocente');
        return (guardado === 'null' || !guardado) ? null : guardado;
    });

    useEffect(() => {
        if (grupoSeleccionado !== null) {
            localStorage.setItem('selectedGroup', grupoSeleccionado);
        } else {
            localStorage.removeItem('selectedGroup');
        }
    }, [grupoSeleccionado]);

    useEffect(() => {
        if (codigoSeleccionado !== null) {
            localStorage.setItem('selectedCode', codigoSeleccionado);
        } else {
            localStorage.removeItem('selectedCode');
        }
    }, [codigoSeleccionado]);

    useEffect(() => {
        if (docenteSeleccionado !== null) {
            localStorage.setItem('selectedDocente', docenteSeleccionado);
        } else {
            localStorage.removeItem('selectedDocente');
        }
    }, [docenteSeleccionado]);


    const cargarCursos = useCallback(async () => {
        if (!usuario) return;
        setCargandoCursos(true);
        try {
            const idDocente = usuario?.role === 'ADMIN' ? docenteSeleccionado : null;
            const datos = await obtenerCursos(idDocente);
            
            const datosOrdenados = datos.sort((a, b) => 
                (a.name || a.nombre || '').localeCompare(b.name || b.nombre || '')
            );
            
            setCursos(datosOrdenados);
            const idCursoGuardado = localStorage.getItem('selectedCourseId');
            const grupoGuardado = localStorage.getItem('selectedGroup');
            const codigoGuardado = localStorage.getItem('selectedCode');

            if (idCursoGuardado === 'TODAS' && usuario?.role === 'ADMIN') {
                setCursoSeleccionado(null);
            } else if (datosOrdenados.length > 0) {
                const encontrado = datosOrdenados.find(c => c.id === idCursoGuardado);
                if (encontrado) {
                    setCursoSeleccionado(encontrado);
                    if (!grupoGuardado) {
                        setGrupoSeleccionado(encontrado.groupCode || encontrado.grupo || null);
                    }
                    if (!codigoGuardado) {
                        setCodigoSeleccionado(encontrado.code || encontrado.codigo || null);
                    }
                } else {
                    const primero = datosOrdenados[0];
                    setCursoSeleccionado(primero);
                    setGrupoSeleccionado(primero.groupCode || primero.grupo || null);
                    setCodigoSeleccionado(primero.code || primero.codigo || null);
                    localStorage.setItem('selectedCourseId', primero.id);
                }
            } else {
                setCursoSeleccionado(null);
                setGrupoSeleccionado(null);
                setCodigoSeleccionado(null);
                localStorage.removeItem('selectedCourseId');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar cursos');
        } finally {
            setCargandoCursos(false);
        }
    }, [usuario, docenteSeleccionado]);

    useEffect(() => {
        cargarCursos();
    }, [cargarCursos]);


    const seleccionarCurso = (curso) => {
        if (curso === undefined) return;
        
        const nombreAnterior = (cursoSeleccionado?.name || cursoSeleccionado?.nombre || '').trim().toLowerCase();
        const nombreNuevo = (curso?.name || curso?.nombre || '').trim().toLowerCase();
        const esMateriaDistinta = nombreAnterior !== nombreNuevo;

        setCursoSeleccionado(curso);

        if (curso) {
            localStorage.setItem('selectedCourseId', curso.id);
        } else {
            localStorage.setItem('selectedCourseId', 'TODAS');
        }

        if (esMateriaDistinta) {
            setGrupoSeleccionado(null);
            setCodigoSeleccionado(null);
            
            if (usuario?.role !== 'ADMIN') {
                setDocenteSeleccionado(null);
            }
        }
    };

    return (
        <ContextoCurso.Provider
            value={{
                cursos,
                cursoSeleccionado,
                seleccionarCurso,
                cargarCursos,
                cargandoCursos,
                grupoSeleccionado,
                setGrupoSeleccionado,
                codigoSeleccionado,
                setCodigoSeleccionado,
                docenteSeleccionado,
                setDocenteSeleccionado,
            }}
        >
            {children}
        </ContextoCurso.Provider>
    );
};

export const useCurso = () => useContext(ContextoCurso);
