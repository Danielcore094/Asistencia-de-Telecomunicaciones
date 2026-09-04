import axios from 'axios';

const clienteApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

clienteApi.interceptors.request.use(configuracion => {
    const token = sessionStorage.getItem('token');
    if (token) {
        configuracion.headers.Authorization = `Bearer ${token}`;
    }
    return configuracion;
});

clienteApi.interceptors.response.use(
    respuesta => respuesta,
    error => {
        const estado = error.response?.status;
        
        const rutasPublicasAutenticacion = [
            '/autenticacion/iniciar-sesion',
            '/autenticacion/verificar-segundo-factor',
        ];
        if (estado === 401 && !rutasPublicasAutenticacion.includes(error.config?.url)) {
            sessionStorage.removeItem('token');
            localStorage.removeItem('selectedCourseId');
            localStorage.removeItem('selectedGroup');
            localStorage.removeItem('selectedCode');
            localStorage.removeItem('selectedDocente');
            window.location.href = '/login';
        }
        
        if (estado === 403) {
            console.error('[API] Acceso denegado:', error.config.url);
        }

        return Promise.reject(error);
    }
);


function filtrosGlobales({ cursoId, codigo, grupo, docenteId, anio, periodo, modalidad, docenteIdLocal } = {}) {
    const parametros = {};
    if (cursoId)       parametros.cursoId       = cursoId;
    if (codigo)        parametros.codigo        = codigo;
    if (grupo)         parametros.grupo         = grupo;
    if (docenteId)     parametros.docenteId     = docenteId;
    if (anio)          parametros.anio          = anio;
    if (periodo)       parametros.periodo       = periodo;
    if (modalidad)     parametros.modalidad     = modalidad;
    if (docenteIdLocal) parametros.docenteId   = docenteIdLocal;
    return parametros;
}



export const obtenerCursos   = (docenteId) => 
    clienteApi.get('/materias', { params: docenteId ? { docenteId } : {} }).then(respuesta => respuesta.data);
export const crearCurso      = (datos)    => clienteApi.post('/materias', datos).then(respuesta => respuesta.data);
export const actualizarCurso = (id, datos)=> clienteApi.put(`/materias/${id}`, datos).then(respuesta => respuesta.data);
export const eliminarCurso   = (id)       => clienteApi.delete(`/materias/${id}`).then(respuesta => respuesta.data);


export const obtenerEstudiantes = (idCurso, filtros = {}) =>
    clienteApi.get('/estudiantes', {
        params: {
            courseId: idCurso,
            ...filtrosGlobales({ ...filtros }),
        },
    }).then(respuesta => respuesta.data);

export const crearEstudiante    = (idCurso, datos) =>
    clienteApi.post('/estudiantes', datos, { params: { courseId: idCurso } }).then(respuesta => respuesta.data);

export const actualizarEstudiante = (id, datos) =>
    clienteApi.put(`/estudiantes/${id}`, datos).then(respuesta => respuesta.data);

export const eliminarEstudiante = (idCurso, id) =>
    clienteApi.delete(`/estudiantes/${id}`, { params: { courseId: idCurso } }).then(respuesta => respuesta.data);


export const obtenerAsistencia = (idCurso, fecha, filtros = {}) => {
    const params = {
        courseId: idCurso,
        ...(fecha && { date: fecha }),
        ...filtrosGlobales({ ...filtros }),
    };
    return clienteApi.get('/asistencia', { params }).then(respuesta => respuesta.data);
};

export const guardarAsistencia = (datos) =>
    clienteApi.post('/asistencia', datos).then(respuesta => respuesta.data);


export const obtenerReportes = (idCurso, params = {}, filtros = {}) =>
    clienteApi.get('/reportes', {
        params: {
            ...(idCurso ? { courseId: idCurso } : {}),
            ...params,
            ...filtrosGlobales({ ...filtros }),
        },
    }).then(respuesta => respuesta.data);

export const obtenerDataExportacion = (idCurso, params = {}, filtros = {}, options = {}) =>
    clienteApi.get('/reportes/exportar', {
        params: {
            ...(idCurso ? { courseId: idCurso } : {}),
            ...params,
            ...filtrosGlobales({ ...filtros }),
        },
        ...options,
    }).then(respuesta => respuesta.data);

export const obtenerReportesSemanal = (parametros = {}) =>
    clienteApi.get('/reportes/semanal', { params: parametros }).then(respuesta => respuesta.data);


export const obtenerDocentes = () =>
    clienteApi.get('/docentes').then(respuesta => respuesta.data.filter(docente => {
        const rol = String(docente.role).toUpperCase();
        return rol === 'TEACHER' || rol === 'DOCENTE';
    }));

export const obtenerAsistenciaHoyPorCurso = (docenteId) =>
    clienteApi.get('/asistencia/hoy', { params: docenteId ? { docenteId } : {} })
        .then(respuesta => Array.isArray(respuesta.data?.cursos) ? respuesta.data.cursos : []);


export const enviarNotificacionesSemanal = () =>
    clienteApi.post('/notificaciones/enviar-semanal').then(respuesta => respuesta.data);

export const obtenerEstadoNotificaciones = () =>
    clienteApi.get('/notificaciones/enviar-semanal').then(respuesta => respuesta.data);

export const obtenerEstadoWhatsApp = (limite = 50) =>
    clienteApi.get('/notificaciones/estado-whatsapp', { params: { limite } }).then(respuesta => respuesta.data);

export const obtenerErroresWhatsApp = (cursoId, limite = 50) =>
    clienteApi.get('/notificaciones/estado-whatsapp', { params: { cursoId, limite, soloErrores: true } }).then(respuesta => respuesta.data);

export const reintentarNotificacionWhatsApp = (id) =>
    clienteApi.post('/notificaciones/estado-whatsapp/reintentar', { id }).then(respuesta => respuesta.data);

export const descargarResumenSemestral = (params = {}) =>
    clienteApi.get('/reportes/resumen-semestral', { params, responseType: 'blob' });

export const obtenerCatalogoMaterias = () =>
    clienteApi.get('/materias/catalogo').then(r => r.data);

export const crearMateriaCatalogo = (datos) =>
    clienteApi.post('/materias/catalogo', datos).then(respuesta => respuesta.data);

export const actualizarMateriaCatalogo = (id, datos) =>
    clienteApi.put(`/materias/catalogo/${id}`, datos).then(respuesta => respuesta.data);

export const eliminarMateriaCatalogo = (id) =>
    clienteApi.delete(`/materias/catalogo/${id}`).then(respuesta => respuesta.data);

export default clienteApi;
