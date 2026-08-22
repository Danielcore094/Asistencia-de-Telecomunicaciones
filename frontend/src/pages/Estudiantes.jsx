import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Trash2, Loader2, Upload, X, CheckCircle2, Pencil, Square, CheckSquare, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { obtenerReportes, obtenerEstudiantes, crearEstudiante, actualizarEstudiante, eliminarEstudiante } from '../services/api';
import toast from 'react-hot-toast';
import { useCurso } from '../context/ContextoCurso';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import FiltrosGlobales from '../components/FiltrosGlobales';
import { formatearNombre, compararPorApellido } from '../utils/formatearNombre';


function ModalEdicion({ estudiante, onGuardar, onCancelar, guardando }) {
    const programasPermitidos = [
        'Ingeniería de Telecomunicaciones',
        'Tecnología en Gestión de Sistemas de Telecomunicaciones',
    ];

    const [form, setForm] = useState({
        name:      estudiante.nombre  || '',
        email:     estudiante.correo  || '',
        correo2:   estudiante.correo2 || '',
        whatsapp:  estudiante.telefono|| '',
        telefono2: estudiante.telefono2 || '',
        franja:    estudiante.franja  || '',
        programa:  estudiante.programa|| '',
    });
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    return (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(2px)' }}>
            <div className="modal-panel w-full max-w-lg rounded-[var(--card-radius)] border flex flex-col"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '90vh' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-lg font-semibold">Editar Estudiante</h3>
                    <button type="button" onClick={onCancelar} disabled={guardando}
                        className="p-1.5 rounded-md disabled:opacity-50" style={{ color: 'var(--color-muted)' }} aria-label="Cerrar modal">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-auto flex-1 px-6 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Nombre completo *</label>
                            <input className="campo w-full" required value={form.name} onChange={set('name')} placeholder="Nombre completo" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Franja</label>
                            <select className="campo w-full" value={form.franja} onChange={set('franja')}>
                                <option value="">Selecciona una franja</option>
                                <option value="Diurna">Diurna</option>
                                <option value="Nocturna">Nocturna</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Programa</label>
                            <select className="campo w-full" value={form.programa} onChange={set('programa')}>
                                <option value="">Selecciona un programa</option>
                                {!programasPermitidos.includes(form.programa) && form.programa && (
                                    <option value={form.programa}>{form.programa}</option>
                                )}
                                <option value="Ingeniería de Telecomunicaciones">Ingeniería de Telecomunicaciones</option>
                                <option value="Tecnología en Gestión de Sistemas de Telecomunicaciones">Tecnología en Gestión</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Correo</label>
                            <input type="email" className="campo w-full" value={form.email} onChange={set('email')} placeholder="correo@ejemplo.com" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Correo 2</label>
                            <input type="email" className="campo w-full" value={form.correo2} onChange={set('correo2')} placeholder="correo2@ejemplo.com" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Teléfono</label>
                            <input className="campo w-full" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+57 300 000 0000" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-texto-secundario">Teléfono 2</label>
                            <input className="campo w-full" value={form.telefono2} onChange={set('telefono2')} placeholder="+57 300 000 0000" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <button type="button" onClick={onCancelar} disabled={guardando} className="boton-secundario">Cancelar</button>
                    <button type="button" onClick={() => onGuardar(form)} disabled={guardando || !form.name.trim()}
                        className="boton-primario inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {guardando ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}


function ModalImportacion({ filas, onConfirmar, onCancelar, onToggleForzar, importando }) {
    return (
        <div
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(2px)' }}
        >
            <div
                className="modal-panel w-full max-w-[1200px] rounded-[var(--card-radius)] border flex flex-col"
                style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    maxHeight: '80vh',
                    width: 'min(98vw, 1200px)',
                }}
            >
                <div
                    className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                >
                    <div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Vista previa — Importación
                        </h3>
                        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {filas.filter(f => !f.esDuplicado && (!f.programaInvalido && !f.franjaInvalida || f.forzar)).length} nueva{filas.filter(f => !f.esDuplicado && (!f.programaInvalido && !f.franjaInvalida || f.forzar)).length !== 1 ? 's' : ''}
                            {filas.filter(f => f.esDuplicado).length > 0 && ` · ${filas.filter(f => f.esDuplicado).length} ya existente${filas.filter(f => f.esDuplicado).length !== 1 ? 's' : ''}`}
                            {filas.filter(f => f.programaInvalido || f.franjaInvalida).length > 0 && ` · ${filas.filter(f => f.programaInvalido || f.franjaInvalida).length} con franja/programa diferentes`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelar}
                        disabled={importando}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: 'var(--color-muted)' }}
                        aria-label="Cerrar modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                            <tr className="text-left" style={{ color: 'var(--color-text-secondary)' }}>
                                <th className="px-4 py-3 font-medium">#</th>
                                <th className="px-4 py-3 font-medium">Documento</th>
                                <th className="px-4 py-3 font-medium">Nombre</th>
                                <th className="px-4 py-3 font-medium">Franja</th>
                                <th className="px-4 py-3 font-medium">Nombre del Programa</th>
                                <th className="px-4 py-3 font-medium">Correo</th>
                                <th className="px-4 py-3 font-medium">Correo 2</th>
                                <th className="px-4 py-3 font-medium">Teléfono</th>
                                <th className="px-4 py-3 font-medium">Teléfono 2</th>
                                <th className="px-4 py-3 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((fila, i) => (
                                <tr
                                    key={i}
                                    className="border-b"
                                    style={{
                                        borderColor: 'var(--color-border)',
                                        backgroundColor: (fila.esDuplicado || fila.programaInvalido || fila.franjaInvalida) ? 'rgba(233, 236, 239, 0.5)' : undefined,
                                    }}
                                >
                                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{i + 1}</td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.documento || '—'}</td>
                                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        {fila.name || <span style={{ color: 'var(--color-absent)', fontStyle: 'italic' }}>Sin nombre</span>}
                                    </td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.franja || '—'}</td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.programa || '—'}</td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.email || '—'}</td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.correo2 || '—'}</td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.whatsapp || '—'}</td>
                                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{fila.telefono2 || '—'}</td>
                                    <td className="px-4 py-2.5">
                                        {fila.programaInvalido || fila.franjaInvalida ? (
                                            <div className="flex flex-col gap-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--badge-radius)] text-xs font-semibold"
                                                    style={{ background: 'var(--color-absent-bg)', color: 'var(--color-absent)' }}>
                                                    {fila.razonInvalido || 'Franja o programa inválido'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleForzar(i)}
                                                    disabled={importando}
                                                    className="boton-primario inline-flex items-center justify-center rounded-[var(--badge-radius)] px-2 py-1 text-xs font-semibold"
                                                    style={{ minWidth: '110px' }}
                                                >
                                                    {fila.forzar ? 'Cargar igual' : 'Permitir carga'}
                                                </button>
                                            </div>
                                        ) : fila.esDuplicado ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--badge-radius)] text-xs font-semibold"
                                                style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                                                Ya existe
                                            </span>
                                        ) : fila.error ? (
                                            <span className="inline-flex items-start px-2 py-0.5 rounded-[var(--badge-radius)] text-xs font-semibold max-w-[260px]"
                                                style={{ background: 'var(--color-absent-bg)', color: 'var(--color-absent)' }}
                                                title={fila.errorMensaje || ''}>
                                                <span
                                                    className="text-left leading-tight break-words"
                                                    style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {fila.errorMensaje || `Error fila ${i + 1}`}
                                                </span>
                                            </span>
                                        ) : fila.importado ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--badge-radius)] text-xs font-semibold"
                                                style={{ background: 'var(--color-present-bg)', color: 'var(--color-present)' }}>
                                                <CheckCircle2 size={12} /> OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--badge-radius)] text-xs font-semibold"
                                                style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                                Nueva
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div
                    className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                >
                    <button
                        type="button"
                        onClick={onCancelar}
                        disabled={importando}
                        className="boton-secundario disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={importando || filas.filter(f => !f.esDuplicado && (!f.programaInvalido && !f.franjaInvalida || f.forzar)).length === 0}
                        className="boton-primario inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importando
                            ? <><Loader2 size={16} className="animate-spin" /> Importando...</>
                            : <><Upload size={16} /> Importar {filas.filter(f => !f.esDuplicado && (!f.programaInvalido && !f.franjaInvalida || f.forzar)).length} nueva{filas.filter(f => !f.esDuplicado && (!f.programaInvalido && !f.franjaInvalida || f.forzar)).length !== 1 ? 's' : ''}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}


export default function Estudiantes() {
    const { usuario } = useAutenticacion();
    const isAdmin = usuario?.role === 'ADMIN';

    const {
        cursoSeleccionado,
        codigoSeleccionado,
        grupoSeleccionado,
        docenteSeleccionado,
    } = useCurso();

    const [estudiantes, setEstudiantes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [formularioEstudiante, setFormularioEstudiante] = useState({
        documento: '',
        name: '',
        franja: '',
        programa: '',
        email: '',
        correo2: '',
        whatsapp: '',
        telefono2: '',
    });
    const [modalFormularioVisible, setModalFormularioVisible] = useState(false);
    const [guardandoEstudiante, setGuardandoEstudiante] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [editandoId, setEditandoId] = useState(null);
    const [estudianteEnEdicion, setEstudianteEnEdicion] = useState(null);
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);
    const [refrescar, setRefrescar] = useState(0);
    const [seleccionados, setSeleccionados] = useState(new Set());
    const [eliminandoMultiple, setEliminandoMultiple] = useState(false);


    const inputArchivoRef = useRef(null);
    const [filasImport, setFilasImport] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [importando, setImportando] = useState(false);
    const [borrandoTodo, setBorrandoTodo] = useState(false);

    const filtros = {
        codigo:    codigoSeleccionado,
        grupo:     grupoSeleccionado,
        docenteId: docenteSeleccionado,
    };


    useEffect(() => {
        const cargarEstudiantes = async () => {
            if (!cursoSeleccionado) {
                setEstudiantes([]);
                setCargando(false);
                return;
            }
            setCargando(true);
            try {
                const [lista, reporte] = await Promise.all([
                    obtenerEstudiantes(cursoSeleccionado.id, filtros),
                    obtenerReportes(cursoSeleccionado.id, {}, filtros),
                ]);
                const porcentajePorId = new Map(reporte.map((item) => [item.id, item.percentage]));
                const normalizados = lista
                    .map((est) => ({
                        id: est.id,
                        documento: est.documento || est.id,
                        nombre: est.name,
                        nombreFormateado: formatearNombre(est.name),
                        curso: cursoSeleccionado.name,
                        correo: est.email || '',
                        correo2: est.correo2 || '',
                        telefono: est.whatsapp || '',
                        telefono2: est.telefono2 || '',
                        franja: est.franja || cursoSeleccionado.franja || '',
                        programa: est.programa || cursoSeleccionado.programa || '',
                        porcentaje: porcentajePorId.get(est.id) ?? 0,
                    }))
                    .sort((a, b) => compararPorApellido(a.nombre, b.nombre));
                setEstudiantes(normalizados);
            } finally {
                setCargando(false);
            }
        };
        cargarEstudiantes();
    }, [cursoSeleccionado, codigoSeleccionado, grupoSeleccionado, docenteSeleccionado, refrescar]);


    const manejarCreacionEstudiante = async (e) => {
        e.preventDefault();
        if (!cursoSeleccionado) return toast.error('Selecciona una materia primero');
        setGuardandoEstudiante(true);
        try {
            await crearEstudiante(cursoSeleccionado.id, formularioEstudiante);
            setRefrescar((p) => p + 1);
            setFormularioEstudiante({
                documento: '',
                name: '',
                franja: '',
                programa: '',
                email: '',
                correo2: '',
                whatsapp: '',
                telefono2: '',
            });
            toast.success('Estudiante añadido exitosamente');
            setModalFormularioVisible(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al añadir estudiante');
        } finally {
            setGuardandoEstudiante(false);
        }
    };

    const manejarEliminacionEstudiante = async (id, nombre) => {
        if (!confirm(`¿Eliminar a "${nombre}"? Se borrarán sus registros de asistencia.`)) return;
        setEliminandoId(id);
        try {
            await eliminarEstudiante(cursoSeleccionado.id, id);
            setRefrescar((p) => p + 1);
            toast.success('Estudiante eliminado');
        } catch {
            toast.error('Error al eliminar estudiante', { duration: 6000 });
        } finally {
            setEliminandoId(null);
        }
    };

    const borrarTodosLosEstudiantes = async () => {
        if (!cursoSeleccionado || estudiantes.length === 0) return;
        if (!confirm(`¿Eliminar a los ${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''} de "${cursoSeleccionado.name}"? Esta acción no se puede deshacer.`)) return;
        setBorrandoTodo(true);
        let errores = 0;
        for (const est of estudiantes) {
            try {
                await eliminarEstudiante(cursoSeleccionado.id, est.id);
            } catch {
                errores++;
            }
        }
        setBorrandoTodo(false);
        setRefrescar((p) => p + 1);
        if (errores === 0) toast.success('Lista de estudiantes borrada');
        else toast.error(`${errores} estudiante${errores !== 1 ? 's' : ''} no pudieron eliminarse`, { duration: 6000 });
    };

    const manejarEdicionEstudiante = async (form) => {
        if (!estudianteEnEdicion) return;
        setGuardandoEdicion(true);
        try {
            await actualizarEstudiante(estudianteEnEdicion.id, form);
            toast.success('Estudiante actualizado');
            setEstudianteEnEdicion(null);
            setRefrescar((p) => p + 1);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al actualizar estudiante');
        } finally {
            setGuardandoEdicion(false);
        }
    };

    const eliminarSeleccionados = async () => {
        if (seleccionados.size === 0) return;
        if (!confirm(`¿Eliminar ${seleccionados.size} estudiante${seleccionados.size !== 1 ? 's' : ''} seleccionado${seleccionados.size !== 1 ? 's' : ''}?`)) return;
        setEliminandoMultiple(true);
        let errores = 0;
        for (const id of seleccionados) {
            try { await eliminarEstudiante(cursoSeleccionado.id, id); }
            catch { errores++; }
        }
        setSeleccionados(new Set());
        setEliminandoMultiple(false);
        setRefrescar((p) => p + 1);
        if (errores === 0) toast.success(`${seleccionados.size} estudiante${seleccionados.size !== 1 ? 's' : ''} eliminado${seleccionados.size !== 1 ? 's' : ''}`);
        else toast.error(`${errores} no pudieron eliminarse`, { duration: 6000 });
    };

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleTodos = () => {
        if (seleccionados.size === filtrados.length) {
            setSeleccionados(new Set());
        } else {
            setSeleccionados(new Set(filtrados.map(e => e.id)));
        }
    };


    const normalizarValor = (valor) => String(valor || '').toString().trim();

    const normalizarClave = (texto) =>
        String(texto || '')
            .normalize('NFD')
            .replace(/[^a-zA-Z0-9 ]+/g, ' ')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

    const obtenerCampoNormalizado = (nombre) => {
        const key = normalizarClave(nombre);

        switch (key) {
            case 'documento':
            case 'doc':
            case 'identificacion':
            case 'id':
                return 'documento';
            case 'nombre':
            case 'name':
            case 'nombre completo':
                return 'name';
            case 'franja':
            case 'turno':
                return 'franja';
            case 'programa':
            case 'nombre del programa':
            case 'nombre programa':
            case 'programa nombre':
                return 'programa';
            case 'correo':
            case 'email':
            case 'correo electronico':
            case 'correo electronico 1':
            case 'email 1':
                return 'email';
            case 'correo 2':
            case 'correo2':
            case 'email 2':
            case 'email2':
                return 'correo2';
            case 'telefono':
            case 'telefono 1':
            case 'telefono celular':
            case 'celular':
            case 'whatsapp':
                return 'whatsapp';
            case 'telefono 2':
            case 'telefono2':
            case 'celular 2':
            case 'celular2':
                return 'telefono2';
            default:
                return null;
        }
    };

    const normalizarColumnas = (fila) => {
        const normalizada = {
            documento: '',
            name: '',
            franja: '',
            programa: '',
            email: '',
            correo2: '',
            whatsapp: '',
            telefono2: '',
        };

        Object.entries(fila).forEach(([clave, valor]) => {
            const campo = obtenerCampoNormalizado(clave);
            if (!campo) return;
            normalizada[campo] = normalizarValor(valor);
        });

        return normalizada;
    };

    const toggleForzarFila = (index) => {
        setFilasImport((fichas) => {
            const next = [...fichas];
            if (!next[index]) return fichas;
            next[index] = { ...next[index], forzar: !next[index].forzar };
            return next;
        });
    };

    const manejarArchivoSeleccionado = (e) => {
        const archivo = e.target.files?.[0];
        if (!inputArchivoRef.current) return;
        inputArchivoRef.current.value = '';

        if (!archivo) return;

        const extension = archivo.name.split('.').pop().toLowerCase();
        const programaCurso = cursoSeleccionado?.programa || null;
        const documentosExistentes = new Set(estudiantes.map(est => est.documento));

        const norm = (s) =>
            (s || '').trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const progCurso  = norm(programaCurso);
        const franjaCurso = norm(cursoSeleccionado?.franja);

        const marcarFilas = (filas) => filas.map(fila => {
            const progFila   = norm(fila.programa);
            const franjaFila = norm(fila.franja);

            const progMal   = !!(progCurso  && progFila  && progFila  !== progCurso);
            const franjaMal = !!(franjaCurso && franjaFila && franjaFila !== franjaCurso);

            let razonInvalido = null;
            if (progMal && franjaMal) razonInvalido = 'Programa y franja incorrectos';
            else if (progMal)          razonInvalido = 'Programa incorrecto';
            else if (franjaMal)        razonInvalido = 'Franja incorrecta';

            return {
                ...fila,
                esDuplicado:     !!(fila.documento && documentosExistentes.has(fila.documento)),
                programaInvalido: progMal,
                franjaInvalida:   franjaMal,
                razonInvalido,
                forzar:          false,
            };
        });

        if (extension === 'csv') {
            Papa.parse(archivo, {
                header: true,
                skipEmptyLines: true,
                complete: (resultado) => {
                    const filas = marcarFilas(resultado.data.map(normalizarColumnas).filter((f) => f.name.trim() !== ''));
                    if (filas.length === 0) {
                        toast.error('El archivo CSV no tiene filas válidas (columna "Nombre" requerida)', { duration: 6000 });
                        return;
                    }
                    setFilasImport(filas);
                    setModalVisible(true);
                },
                error: () => toast.error('Error al parsear el archivo CSV', { duration: 6000 }),
            });
        } else if (extension === 'xlsx' || extension === 'xls') {
            const lector = new FileReader();
            lector.onload = (ev) => {
                try {
                    const workbook = XLSX.read(ev.target.result, { type: 'array' });
                    const hoja = workbook.Sheets[workbook.SheetNames[0]];
                    const datos = XLSX.utils.sheet_to_json(hoja, { defval: '' });
                    const filas = marcarFilas(datos.map(normalizarColumnas).filter((f) => f.name.trim() !== ''));
                    if (filas.length === 0) {
                        toast.error('El archivo Excel no tiene filas válidas (columna "Nombre" requerida)', { duration: 6000 });
                        return;
                    }
                    setFilasImport(filas);
                    setModalVisible(true);
                } catch {
                    toast.error('Error al leer el archivo Excel', { duration: 6000 });
                }
            };
            lector.readAsArrayBuffer(archivo);
        } else {
            toast.error('Formato no soportado. Usa .csv, .xlsx o .xls', { duration: 6000 });
        }
    };

    const confirmarImportacion = async () => {
        if (!cursoSeleccionado || filasImport.length === 0) return;
        setImportando(true);

        let exitosos = 0;
        let otrosErrores = 0;
        const filasActualizadas = [...filasImport];

                for (let i = 0; i < filasActualizadas.length; i++) {
                    const fila = filasActualizadas[i];
                    const estaBloqueada = fila.esDuplicado || (!(fila.forzar || (!fila.programaInvalido && !fila.franjaInvalida)));
                    if (estaBloqueada) {
                        filasActualizadas[i] = { ...fila, importado: false, error: false };
                        continue;
                    }
                    try {
                await crearEstudiante(cursoSeleccionado.id, {
                    documento: fila.documento || null,
                    name: fila.name,
                    franja: fila.franja || null,
                    programa: fila.programa || null,
                    email: fila.email || fila.correo2 || null,
                    correo2: fila.correo2 || null,
                    whatsapp: fila.whatsapp || fila.telefono2 || null,
                    telefono2: fila.telefono2 || null,
                });
                        filasActualizadas[i] = { ...fila, importado: true, error: false };
                        exitosos++;
                    } catch (err) {
                        const msgError = err.response?.data?.error || err.message || 'Error desconocido';
                        filasActualizadas[i] = { ...fila, importado: false, error: true, errorMensaje: msgError };
                        if (!String(msgError).toLowerCase().includes('ya está inscrito en esta materia')) {
                            otrosErrores++;
                        }
                    }
                    setFilasImport([...filasActualizadas]);
                }

        setImportando(false);

        if (exitosos > 0) {
            toast.success(`${exitosos} estudiante${exitosos !== 1 ? 's' : ''} importado${exitosos !== 1 ? 's' : ''} correctamente`);
            setRefrescar((p) => p + 1);
        }

        if (otrosErrores > 0) {
            toast.error(`${otrosErrores} estudiante${otrosErrores !== 1 ? 's' : ''} no pudieron importarse. Revisa la columna Estado.`);
        }

        const hayErrores = filasActualizadas.some((f) => f.error);
        if (!hayErrores) {
            setModalVisible(false);
            setFilasImport([]);
        }
    };

    const cancelarImportacion = () => {
        if (importando) return;
        setModalVisible(false);
        setFilasImport([]);
    };

    const descargarPlantilla = () => {
        const columnas = [
            ['No', 'Documento', 'Nombre', 'Franja', 'Nombre del Programa', 'Correo', 'Correo 2', 'Telefono', 'Telefono 2'],
        ];
        const hoja = XLSX.utils.aoa_to_sheet(columnas);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Plantilla');
        XLSX.writeFile(libro, 'plantilla_estudiantes.xlsx');
    };


    const filtrados = useMemo(
        () =>
            estudiantes.filter(
                (est) =>
                    est.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                    est.id.toLowerCase().includes(busqueda.toLowerCase()),
            ),
        [busqueda, estudiantes],
    );

    return (
        <>
            {estudianteEnEdicion && (
                <ModalEdicion
                    estudiante={estudianteEnEdicion}
                    onGuardar={manejarEdicionEstudiante}
                    onCancelar={() => setEstudianteEnEdicion(null)}
                    guardando={guardandoEdicion}
                />
            )}
            {modalVisible && (
                <ModalImportacion
                    filas={filasImport}
                    onConfirmar={confirmarImportacion}
                    onCancelar={cancelarImportacion}
                    onToggleForzar={toggleForzarFila}
                    importando={importando}
                />
            )}

            <section className="space-y-6">
                <div className="tarjeta flex flex-wrap items-center gap-4">
                    <FiltrosGlobales mostrarTodas={false} />
                </div>

                <header className="tarjeta flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold">Estudiantes</h2>
                            <p className="mt-1 text-sm text-texto-secundario">Listado y porcentaje de asistencia por estudiante.</p>
                        </div>
                        {!isAdmin && cursoSeleccionado && (
                            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setModalFormularioVisible(true)}
                                    className="boton-primario inline-flex h-[38px] items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Nuevo Estudiante
                                </button>
                                <input
                                    ref={inputArchivoRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    aria-label="Seleccionar archivo de importación"
                                    onChange={manejarArchivoSeleccionado}
                                />
                                <button
                                    type="button"
                                    onClick={() => inputArchivoRef.current?.click()}
                                    className="boton-secundario inline-flex h-[38px] items-center justify-center gap-2"
                                >
                                    <Upload size={16} />
                                    Importar Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={descargarPlantilla}
                                    className="boton-secundario inline-flex h-[38px] items-center justify-center gap-2"
                                    title="Descargar plantilla Excel para importar estudiantes"
                                >
                                    <FileDown size={16} />
                                    Plantilla
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {cursoSeleccionado && (
                    <section className="tarjeta">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-lg font-semibold">{cursoSeleccionado.name || cursoSeleccionado.nombre}</p>
                                <div className="mt-1 text-xs text-texto-secundario">{cursoSeleccionado.code || cursoSeleccionado.codigo} · Grupo {grupoSeleccionado || cursoSeleccionado.groupCode || cursoSeleccionado.grupo}</div>
                            </div>
                            <div className="periodo-badge" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-dark)', borderColor: 'color-mix(in srgb, var(--color-accent-dark) 20%, transparent)' }}>
                                <span className="periodo-badge__text">Periodo {cursoSeleccionado.academicPeriod || cursoSeleccionado.periodo || cursoSeleccionado.period} ({cursoSeleccionado.academicYear || cursoSeleccionado.anio || new Date().getFullYear()})</span>
                            </div>
                        </div>
                    </section>
                )}

                {cursoSeleccionado && modalFormularioVisible && (
                    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(2px)' }}>
                        <div className="modal-panel w-full max-w-4xl rounded-[var(--card-radius)] border flex flex-col" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '90vh' }}>
                            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Plus size={20} className="text-primario" />
                                    Añadir Nuevo Estudiante
                                </h3>
                                <button type="button" onClick={() => setModalFormularioVisible(false)} disabled={guardandoEstudiante} className="p-1.5 rounded-md disabled:opacity-50" style={{ color: 'var(--color-muted)' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="overflow-auto flex-1 px-6 py-4">
                                <form id="form-estudiante" onSubmit={manejarCreacionEstudiante} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Documento</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. 1098765432"
                                    className="campo w-full"
                                    value={formularioEstudiante.documento}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, documento: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Nombre completo</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Ana García"
                                    className="campo w-full"
                                    value={formularioEstudiante.name}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Franja</label>
                                <select
                                    required
                                    className="campo w-full"
                                    value={formularioEstudiante.franja}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, franja: e.target.value })}
                                >
                                    <option value="">Selecciona una franja</option>
                                    <option value="Diurna">Diurna</option>
                                    <option value="Nocturna">Nocturna</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Nombre del Programa</label>
                                <select
                                    required
                                    className="campo w-full"
                                    value={formularioEstudiante.programa}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, programa: e.target.value })}
                                >
                                    <option value="">Selecciona un programa</option>
                                    <option value="Ingeniería de Telecomunicaciones">Ingeniería de Telecomunicaciones</option>
                                    <option value="Tecnología en Gestión de Sistemas de Telecomunicaciones">Tecnología en Gestión de Sistemas de Telecomunicaciones</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">
                                    Correo
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="correo@ejemplo.com"
                                    className="campo w-full"
                                    value={formularioEstudiante.email}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">
                                    Correo 2 <span className="font-normal text-xs">(Opcional)</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="correo2@ejemplo.com"
                                    className="campo w-full"
                                    value={formularioEstudiante.correo2}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, correo2: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">
                                    Telefono
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="+57 300 000 0000"
                                    className="campo w-full"
                                    value={formularioEstudiante.whatsapp}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, whatsapp: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">
                                    Telefono 2 <span className="font-normal text-xs">(Opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="+57 300 000 0000"
                                    className="campo w-full"
                                    value={formularioEstudiante.telefono2}
                                    onChange={(e) => setFormularioEstudiante({ ...formularioEstudiante, telefono2: e.target.value })}
                                />
                            </div>
                                </form>
                            </div>
                            <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                <button type="button" onClick={() => setModalFormularioVisible(false)} disabled={guardandoEstudiante} className="boton-secundario">Cancelar</button>
                                <button type="submit" form="form-estudiante" disabled={guardandoEstudiante} className="boton-primario inline-flex items-center gap-2 disabled:opacity-50">
                                    {guardandoEstudiante ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar Estudiante'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="tarjeta">
                    <div className="flex items-center gap-2 rounded-[var(--input-radius)] border bg-superficie px-3"
                        style={{ borderColor: 'var(--color-border)' }}>
                        <Search size={16} className="text-texto-secundario" />
                        <input
                            type="text"
                            className="h-10 w-full border-none bg-transparent text-sm outline-none"
                            placeholder="Buscar por nombre o ID"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <section className="tarjeta p-0">
                    {!isAdmin && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-3 text-sm font-medium text-texto-secundario">
                            <span>{filtrados.length} estudiante{filtrados.length !== 1 ? 's' : ''} registrados</span>
                        </div>
                        <div className="flex items-center gap-3 mt-3 sm:mt-0">
                            {seleccionados.size > 0 && (
                                <button type="button" onClick={eliminarSeleccionados} disabled={eliminandoMultiple}
                                    className="inline-flex items-center gap-2 rounded-[var(--input-radius)] px-3 h-8 text-sm font-semibold transition-colors disabled:opacity-50"
                                    style={{ border: '1px solid var(--color-absent)', color: 'var(--color-absent)', background: 'var(--color-surface)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-absent-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                                >
                                    {eliminandoMultiple ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    Eliminar {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                                </button>
                            )}
                            {estudiantes.length > 0 && (
                                <button type="button" onClick={borrarTodosLosEstudiantes} disabled={borrandoTodo}
                                    className="inline-flex items-center gap-2 rounded-[var(--input-radius)] px-3 h-8 text-sm font-semibold transition-colors disabled:opacity-50"
                                    style={{ border: '1px solid var(--color-absent)', color: 'var(--color-absent)', background: 'transparent' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-absent-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {borrandoTodo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    Borrar todo
                                </button>
                            )}
                        </div>
                    </div>
                )}

                    {cargando ? (
                        <p className="p-6 text-sm text-texto-secundario">Cargando...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                    {!isAdmin && <col style={{ width: '48px' }} />}
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: isAdmin ? '22%' : '24%' }} />
                                    <col style={{ width: isAdmin ? '28%' : '24%' }} />
                                    <col style={{ width: isAdmin ? '22%' : '22%' }} />
                                    <col style={{ width: '10%' }} />
                                    {!isAdmin && <col style={{ width: '8%' }} />}
                                </colgroup>
                                <thead style={{ background: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                                    <tr className="text-left text-texto-secundario">
                                        {!isAdmin && (
                                            <th className="px-4 py-3">
                                                <button type="button" onClick={toggleTodos} className="flex items-center" title="Seleccionar todos">
                                                    {seleccionados.size === filtrados.length && filtrados.length > 0
                                                        ? <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                                        : <Square size={16} style={{ color: 'var(--color-muted)' }} />}
                                                </button>
                                            </th>
                                        )}
                                        <th className="px-4 py-3 font-medium">Documento</th>
                                        <th className="px-4 py-3 font-medium">Nombre</th>
                                        <th className="px-4 py-3 font-medium">Programa</th>
                                        <th className="px-4 py-3 font-medium">Materia</th>
                                        <th className="px-4 py-3 text-right font-medium">% asistencia</th>
                                        {!isAdmin && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map((est) => (
                                        <tr key={est.id} className="border-b"
                                            style={{ borderColor: 'var(--color-border)', background: seleccionados.has(est.id) ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)' : 'transparent' }}>
                                            {!isAdmin && (
                                                <td className="px-4 py-3">
                                                    <button type="button" onClick={() => toggleSeleccion(est.id)} className="flex items-center">
                                                        {seleccionados.has(est.id)
                                                            ? <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                                            : <Square size={16} style={{ color: 'var(--color-muted)' }} />}
                                                    </button>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 font-mono text-xs text-texto-secundario">{est.documento}</td>
                                            <td className="px-4 py-3 font-medium text-texto" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{est.nombreFormateado}</td>
                                            <td className="px-4 py-3 text-texto-secundario" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{est.programa || '—'}</td>
                                            <td className="px-4 py-3 text-texto-secundario" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{est.curso}</td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {Number(est.porcentaje).toLocaleString('es-CO')}%
                                            </td>
                                            {!isAdmin && (
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEstudianteEnEdicion(est)}
                                                            disabled={editandoId === est.id || eliminandoId === est.id}
                                                            className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                                                            style={{ color: 'var(--color-muted)' }}
                                                            title="Editar estudiante"
                                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-light)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => manejarEliminacionEstudiante(est.id, est.nombre)}
                                                            disabled={eliminandoId === est.id || editandoId === est.id}
                                                            className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                                                            style={{ color: 'var(--color-muted)' }}
                                                            title="Eliminar estudiante"
                                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-absent)'; e.currentTarget.style.background = 'var(--color-absent-bg)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                                        >
                                                            {eliminandoId === est.id
                                                                ? <Loader2 size={16} className="animate-spin" />
                                                                : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filtrados.length === 0 && (
                                        <tr>
                                            <td colSpan={isAdmin ? "4" : "6"} className="px-4 py-8 text-center text-texto-secundario">
                                                No hay estudiantes para los filtros seleccionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </section>
        </>
    );
}
