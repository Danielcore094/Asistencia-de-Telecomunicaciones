import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    ShieldCheck, 
    User, 
    Calendar, 
    Activity, 
    Search, 
    RefreshCcw,
    FileText,
    Key,
    Database,
    Users,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const etiquetasEntidad = {
    AUTH: 'Autenticación',
    COURSE: 'Materia',
    REPORT: 'Reporte',
    STUDENT: 'Estudiante',
    ATTENDANCE: 'Asistencia',
    MATERIA_CATALOGO: 'Catálogo de materias',
    TEACHER: 'Docente',
    USER: 'Usuario',
    NOTIFICATION: 'Notificación',
};

const obtenerEtiquetaEntidad = (entidad) => etiquetasEntidad[entidad]
    || entidad.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (letra) => letra.toUpperCase());

const Auditoria = () => {
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [total, setTotal] = useState(0);
    const [pagina, setPagina] = useState(0);
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [modalLog, setModalLog] = useState(null);
    const limite = 20;

    const obtenerLogs = async () => {
        try {
            setCargando(true);
            const res = await api.get(`/auditoria?limit=${limite}&offset=${pagina * limite}`);
            setRegistros(res.data.logs);
            setTotal(res.data.total);
        } catch (error) {
            console.error('Error al cargar logs:', error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        obtenerLogs();
    }, [pagina]);

    const getActionIcon = (action) => {
        if (action.includes('LOGIN')) return <Key className="text-purple-500" size={18} />;
        if (action.includes('CREAR')) return <Database className="text-green-500" size={18} />;
        if (action.includes('GUARDAR')) return <FileText className="text-blue-500" size={18} />;
        if (action.includes('EXPORTAR')) return <Activity className="text-orange-500" size={18} />;
        return <Activity className="text-gray-500" size={18} />;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const etiquetaDetalle = (key) => {
        const mapeo = {
            courseId: 'Materia',
            courseName: 'Materia',
            courseNames: 'Materias',
            courseCount: 'Cantidad de materias',
            cursoId: 'Materia',
            nombreCurso: 'Materia',
            nombresCursos: 'Materias',
            cantidadCursos: 'Cantidad de materias',
            codigo: 'Código',
            code: 'Código',
            grupo: 'Grupo',
            group: 'Grupo',
            targetId: 'ID de entidad',
            identificadorEntidad: 'ID de materia',
            userId: 'ID de usuario',
            name: 'Nombre',
            docente: 'Docente',
            teacher: 'Docente',
            teacherName: 'Docente',
            docenteNombre: 'Docente',
            idDocente: 'Docente',
            nombreDocente: 'Docente',
            cantidadMaterias: 'Cantidad de materias',
            totalEstudiantes: 'Total de estudiantes',
            totalRegistros: 'Total de registros',
            semanaInicio: 'Inicio de semana',
            semanaFin: 'Fin de semana',
            fechaInicio: 'Fecha de inicio',
            fechaFin: 'Fecha de fin',
            email: 'Email',
            phone: 'Teléfono',
            details: 'Detalles',
            sent: 'Enviados',
            skipped: 'Omitidos',
            errors: 'Errores',
            status: 'Estado'
        };
        return mapeo[key] || key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const renderDetailValue = (value) => {
        if (value === null || value === undefined || value === '') return '—';
        if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ');
        if (typeof value === 'object') return <pre className="whitespace-pre-wrap text-xs text-gray-600">{JSON.stringify(value, null, 2)}</pre>;
        return String(value);
    };

    const renderDetalles = (log) => {
        let detalles = log.details;
        if (!detalles) {
            return <span className="text-gray-400">Sin detalles</span>;
        }

        if (typeof detalles === 'string') {
            try {
                detalles = JSON.parse(detalles);
            } catch {
                return <span className="whitespace-pre-wrap text-sm text-gray-600">{detalles}</span>;
            }
        }

        if (typeof detalles !== 'object' || Object.keys(detalles).length === 0) {
            return <span className="text-gray-400">Sin detalles</span>;
        }

        const filasTodas = [...Object.entries(detalles)];
        // Si ya existe el nombre del curso, ocultar el identificador crudo para evitar repetir información
        const tieneNombreCurso = (Object.prototype.hasOwnProperty.call(detalles, 'nombreCurso') && detalles.nombreCurso)
            || (Object.prototype.hasOwnProperty.call(detalles, 'courseName') && detalles.courseName);
        if (tieneNombreCurso) {
            for (let i = filasTodas.length - 1; i >= 0; i--) {
                if (filasTodas[i][0] === 'courseId' || filasTodas[i][0] === 'cursoId') {
                    filasTodas.splice(i, 1);
                }
            }
        }
        if (log.target === 'COURSE') {
            for (let i = filasTodas.length - 1; i >= 0; i--) {
                if (filasTodas[i][0] === 'targetId') filasTodas.splice(i, 1);
            }
            if (log.identificadorEntidad && !Object.prototype.hasOwnProperty.call(detalles, 'identificadorEntidad')) {
                filasTodas.unshift(['identificadorEntidad', log.identificadorEntidad]);
            }
        } else if (log.targetId && !Object.prototype.hasOwnProperty.call(detalles, 'targetId')) {
            filasTodas.unshift(['targetId', log.targetId]);
        }

        // Filtrar claves que no aportan información (null, "", [], {})
        const filas = filasTodas.filter(([k, v]) => {
            if (v === null || v === undefined) return false;
            if (typeof v === 'string' && v.trim() === '') return false;
            if (Array.isArray(v) && v.length === 0) return false;
            if (typeof v === 'object' && Object.keys(v).length === 0) return false;
            return true;
        });

        if (filas.length === 0) {
            return (
                <div className="text-sm text-gray-600">No se registraron cambios relevantes.</div>
            );
        }

        return (
            <div className="space-y-1 text-sm text-gray-700">
                {filas.map(([key, value]) => {
                    // Frases más naturales para claves específicas
                    if (key === 'sent' || key === 'enviados') {
                        return (
                            <div key={key} className="flex items-start gap-2">
                                <span className="min-w-[85px] text-[11px] uppercase tracking-[0.08em] text-gray-400">Envíos:</span>
                                <span>{Number(value)} mensaje{Number(value) !== 1 ? 's' : ''} enviados</span>
                            </div>
                        );
                    }

                    if (key === 'skipped') {
                        return (
                            <div key={key} className="flex items-start gap-2">
                                <span className="min-w-[85px] text-[11px] uppercase tracking-[0.08em] text-gray-400">Omitidos:</span>
                                <span>{Number(value)}</span>
                            </div>
                        );
                    }

                    if (key === 'errors') {
                        return (
                            <div key={key} className="flex items-start gap-2">
                                <span className="min-w-[85px] text-[11px] uppercase tracking-[0.08em] text-gray-400">Errores:</span>
                                <span className="text-red-600">{Number(value)}</span>
                            </div>
                        );
                    }

                    // Valores de tipo objeto se muestran de forma legible
                    return (
                        <div key={key} className="flex items-start gap-2">
                            <span className="min-w-[85px] text-[11px] uppercase tracking-[0.08em] text-gray-400">{etiquetaDetalle(key)}:</span>
                            <span className="break-words">{renderDetailValue(value)}</span>
                        </div>
                    );
                })}

                
            </div>
        );
    };

    const logsFiltrados = registros.filter(log => 
        log.userName.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        log.action.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        obtenerEtiquetaEntidad(log.target).toLowerCase().includes(terminoBusqueda.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <ShieldCheck className="text-[var(--color-primary)]" size={32} />
                        Auditoría del Sistema
                    </h1>
                    <p className="text-gray-500 mt-1">Registro histórico de acciones de los usuarios</p>
                </div>
                <button 
                    onClick={obtenerLogs}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Actualizar"
                >
                    <RefreshCcw size={20} className={cargando ? 'animate-spin text-gray-400' : 'text-gray-600'} />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Buscar por usuario, acción o entidad..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                            value={terminoBusqueda}
                            onChange={(e) => setTerminoBusqueda(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Mostrando {logsFiltrados.length} de {total} registros</span>
                        <div className="flex items-center gap-1 ml-4">
                            <button 
                                onClick={() => setPagina(p => Math.max(0, p - 1))}
                                disabled={pagina === 0 || cargando}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">Pág. {pagina + 1}</span>
                            <button 
                                onClick={() => setPagina(p => p + 1)}
                                disabled={(pagina + 1) * limite >= total || cargando}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal de detalles */}
                {modalLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setModalLog(null)} />
                        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Detalles de auditoría</h3>
                                <button onClick={() => setModalLog(null)} className="text-sm text-texto-secundario">Cerrar</button>
                            </div>
                            <div className="text-sm text-gray-700">
                                <div className="mb-2 text-xs text-gray-500">{modalLog.userName} · {formatDate(modalLog.createdAt)}</div>
                                <div className="border-t pt-3">
                                    {renderDetalles(modalLog)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                                <th className="px-6 py-4">Fecha y Hora</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Acción</th>
                                <th className="px-6 py-4">Entidad</th>
                                <th className="px-6 py-4">Acciones</th>
                                <th className="px-6 py-4">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {cargando && registros.length === 0 ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logsFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        No se encontraron registros.
                                    </td>
                                </tr>
                            ) : logsFiltrados.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            {formatDate(log.createdAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                {log.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-700">{log.userName}</div>
                                                <div className="text-[10px] text-gray-400 uppercase font-bold">{log.userRole}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                            {getActionIcon(log.action)}
                                            {log.action.replace(/_/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {obtenerEtiquetaEntidad(log.target)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setModalLog(log)}
                                            className="text-sm text-purple-600 hover:underline"
                                        >
                                            Ver más
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                                        {log.ip || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Auditoria;
