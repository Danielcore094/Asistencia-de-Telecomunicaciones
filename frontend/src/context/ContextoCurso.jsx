import { createContext, useState, useEffect, useContext } from 'react';
import { obtenerCursos } from '../services/api';
import { useAutenticacion } from './ContextoAutenticacion';
import toast from 'react-hot-toast';

// Contexto de cursos activos del docente
const ContextoCurso = createContext(null);

export const ProveedorCurso = ({ children }) => {
    const { usuario } = useAutenticacion();
    const [cursos, setCursos] = useState([]);
    const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
    const [cargandoCursos, setCargandoCursos] = useState(true);

    // Filtros secundarios

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

    // Persistir filtros secundarios en el almacenamiento local.
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

    // Carga de cursos

    const cargarCursos = async () => {
        if (!usuario) return;
        setCargandoCursos(true);
        try {
            // El ADMIN puede filtrar por docenteSeleccionado (traído del localStorage o seteado en UI)
            const idDocente = usuario?.role === 'ADMIN' ? docenteSeleccionado : null;
            const datos = await obtenerCursos(idDocente);
            
            // Ordenar cursos alfabéticamente por nombre
            const datosOrdenados = datos.sort((a, b) => 
                (a.name || a.nombre || '').localeCompare(b.name || b.nombre || '')
            );
            
            setCursos(datosOrdenados);
            const idCursoGuardado = localStorage.getItem('selectedCourseId');

            if (idCursoGuardado === 'TODAS' && usuario?.role === 'ADMIN') {
                // Admin eligió "Todas las materias" — mantener null
                setCursoSeleccionado(null);
            } else if (datosOrdenados.length > 0) {
                const encontrado = datosOrdenados.find(c => c.id === idCursoGuardado);
                if (encontrado) {
                    setCursoSeleccionado(encontrado);
                    // Si no hay grupo seleccionado en el estado/localStorage, sincronizar con el del curso encontrado
                    if (!grupoSeleccionado) {
                        setGrupoSeleccionado(encontrado.groupCode || encontrado.grupo || null);
                    }
                } else if (!cursoSeleccionado) {
                    // Sin selección guardada válida o primera vez → elegir el primero ordenado
                    const primero = datosOrdenados[0];
                    setCursoSeleccionado(primero);
                    setGrupoSeleccionado(primero.groupCode || primero.grupo || null);
                    localStorage.setItem('selectedCourseId', primero.id);
                }
            } else {
                setCursoSeleccionado(null);
                setGrupoSeleccionado(null);
                localStorage.removeItem('selectedCourseId');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar cursos');
        } finally {
            setCargandoCursos(false);
        }
    };

    useEffect(() => {
        cargarCursos();
        // eslint-disable-next-line
    }, [usuario, docenteSeleccionado]);

    // Selección de curso principal

    // Al cambiar la materia activa, resetear todos los filtros secundarios solo si es una MATERIA distinta
    const seleccionarCurso = (curso) => {
        if (curso === undefined) return;
        
        // Comparar nombres para saber si cambiamos de materia (ignorando grupo/sección)
        const nombreAnterior = (cursoSeleccionado?.name || cursoSeleccionado?.nombre || '').trim().toLowerCase();
        const nombreNuevo = (curso?.name || curso?.nombre || '').trim().toLowerCase();
        const esMateriaDistinta = nombreAnterior !== nombreNuevo;

        setCursoSeleccionado(curso);

        if (curso) {
            localStorage.setItem('selectedCourseId', curso.id);
        } else {
            localStorage.setItem('selectedCourseId', 'TODAS');
        }

        // Solo resetear filtros secundarios si de verdad cambiamos de materia
        if (esMateriaDistinta) {
            setGrupoSeleccionado(null);
            setCodigoSeleccionado(null);
            
            // No resetear el filtro de docente si es admin (queremos mantener la supervisión)
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
                // Filtros secundarios
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
