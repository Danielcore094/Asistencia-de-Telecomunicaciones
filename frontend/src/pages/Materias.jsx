import { useEffect, useRef, useState } from 'react';
import { useCurso } from '../context/ContextoCurso';
import { obtenerReportes, crearCurso, eliminarCurso, actualizarCurso, obtenerCatalogoMaterias } from '../services/api';
import { BookOpen, Trash2, Plus, Loader2, ChevronDown, Pencil, Download, Upload, X, CheckCircle2, AlertCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import * as XLSX from 'xlsx';
import FiltrosGlobales from '../components/FiltrosGlobales';

export default function Materias() {
    const { cursos, cargandoCursos, cargarCursos } = useCurso();
    const { usuario } = useAutenticacion();
    const isAdmin = usuario?.role === 'ADMIN';
    const [estadisticasCursos, setEstadisticasCursos] = useState([]);
    const [cargandoEstadisticas, setCargandoEstadisticas] = useState(false);
    const [catalogo, setCatalogo] = useState([]);
    const [formularioCurso, setFormularioCurso] = useState({ name: '', code: '', groupCode: '', academicPeriod: '1', academicYear: new Date().getFullYear().toString(), dia: '', horaInicio: '', horaFin: '', dia2: '', horaInicio2: '', horaFin2: '', franja: '', programa: '' });
    const [modalFormularioVisible, setModalFormularioVisible] = useState(false);
    const [mostrarSegundoDia, setMostrarSegundoDia] = useState(false);
    const [guardandoCurso, setGuardandoCurso] = useState(false);
    const [cursoEnEdicion, setCursoEnEdicion] = useState(null);
    const horariosDiurnos = (() => {
        const opciones = [];
        const incluirHora = (hora, minuto) => {
            opciones.push(`${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`);
        };

        for (let hora = 6; hora <= 18; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 15) {
                if (hora < 18 || minuto === 0) incluirHora(hora, minuto);
            }
        }

        return opciones;
    })();
    const horariosInicioOpciones = formularioCurso.franja === 'Nocturna'
        ? ['06:00', '18:30', '20:15']
        : horariosDiurnos.filter((hora) => !['16:45', '17:00', '17:15', '17:30', '17:45', '18:00'].includes(hora));
    const horariosFinOpciones = formularioCurso.franja === 'Nocturna'
        ? ['07:30', '20:00', '21:30', '21:45']
        : horariosDiurnos.filter((hora) => !['06:00', '06:15', '06:30', '06:45', '07:00', '07:15'].includes(hora));
    const [eliminandoId, setEliminandoId] = useState(null);
    const [importandoCursos, setImportandoCursos] = useState(false);
    const [filasImportCurso, setFilasImportCurso] = useState([]);
    const [modalImportCursoVisible, setModalImportCursoVisible] = useState(false);
    const inputArchivoCursoRef = useRef(null);

    useEffect(() => {
        obtenerCatalogoMaterias().then(setCatalogo).catch(() => setCatalogo([]));
    }, []);

    useEffect(() => {
        const cargarEstadisticas = async () => {
            if (cursos.length === 0) {
                setEstadisticasCursos([]);
                return;
            }

            setCargandoEstadisticas(true);
            try {
                const respuestas = await Promise.all(
                    cursos.map(async (curso) => {
                        const reporteCurso = await obtenerReportes(curso.id, {});
                        const acumulado = reporteCurso.reduce((total, item) => total + item.percentage, 0);
                        const promedio = reporteCurso.length > 0 ? Math.round(acumulado / reporteCurso.length) : 0;
                        return {
                            id: curso.id,
                            nombre: curso.name,
                            codigo: curso.code,
                            grupo: curso.groupCode || 'A',
                            periodo: curso.academicPeriod || '1',
                            anio: curso.academicYear || '2024',
                            profesor: curso.teacher?.name || usuario?.name || 'Sin profesor asignado',
                            horario: (curso.dia && curso.horaInicio && curso.horaFin) 
                                ? `${curso.dia} de ${curso.horaInicio} a ${curso.horaFin}${curso.dia2 ? ` y ${curso.dia2} de ${curso.horaInicio2} a ${curso.horaFin2}` : ''}` 
                                : curso.schedule || 'Sin horario asignado',
                            franja: curso.franja || 'Sin franja',
                            programa: curso.programa || 'Sin programa',
                            porcentaje: promedio,
                        };
                    }),
                );
                setEstadisticasCursos(respuestas);
            } finally {
                setCargandoEstadisticas(false);
            }
        };

        cargarEstadisticas();
    }, [cursos, usuario?.name]);

    const manejarEnvioCurso = async (e) => {
        e.preventDefault();
        setGuardandoCurso(true);
        try {
            if (cursoEnEdicion) {
                await actualizarCurso(cursoEnEdicion.id, formularioCurso);
                toast.success('Materia actualizada exitosamente');
            } else {
                await crearCurso(formularioCurso);
                toast.success('Materia creada exitosamente');
            }
            await cargarCursos();
            setFormularioCurso({ name: '', code: '', groupCode: '', academicPeriod: '1', academicYear: new Date().getFullYear().toString(), dia: '', horaInicio: '', horaFin: '', dia2: '', horaInicio2: '', horaFin2: '', franja: '', programa: '' });
            setMostrarSegundoDia(false);
            setCursoEnEdicion(null);
            setModalFormularioVisible(false);
        } catch (err) {
            const mensajeError = err.response?.data?.error
                || err.response?.data?.message
                || (err.response?.status === 409
                    ? 'Ya tienes una materia con el mismo programa, franja y horario.'
                    : 'No fue posible guardar la materia. Inténtalo nuevamente.');
            toast.error(mensajeError);
        } finally {
            setGuardandoCurso(false);
        }
    };

    const iniciarEdicionCurso = (cursoCompleto) => {
        const c = cursos.find(x => x.id === cursoCompleto.id);
        if (!c) return;
        setCursoEnEdicion(c);
        setFormularioCurso({
            name: c.name || '',
            code: c.code || '',
            groupCode: c.groupCode || '',
            academicPeriod: c.academicPeriod || '1',
            academicYear: c.academicYear || new Date().getFullYear().toString(),
            dia: c.dia || '',
            horaInicio: c.horaInicio || '',
            horaFin: c.horaFin || '',
            dia2: c.dia2 || '',
            horaInicio2: c.horaInicio2 || '',
            horaFin2: c.horaFin2 || '',
            franja: c.franja || '',
            programa: c.programa || ''
        });
        setMostrarSegundoDia(!!(c.dia2 || c.horaInicio2 || c.horaFin2));
        setModalFormularioVisible(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setCursoEnEdicion(null);
        setFormularioCurso({ name: '', code: '', groupCode: '', academicPeriod: '1', academicYear: new Date().getFullYear().toString(), dia: '', horaInicio: '', horaFin: '', dia2: '', horaInicio2: '', horaFin2: '', franja: '', programa: '' });
        setMostrarSegundoDia(false);
        setModalFormularioVisible(false);
    };

    const manejarEliminacionCurso = async (id, nombre) => {
        if (!confirm(`¿Eliminar la materia "${nombre}"? Se perderán todos sus estudiantes y asistencia.`)) return;
        setEliminandoId(id);
        try {
            await eliminarCurso(id);
            await cargarCursos();
            toast.success('Materia eliminada');
        } catch (err) {
            toast.error('Error al eliminar materia');
        } finally {
            setEliminandoId(null);
        }
    };

    const exportarPlantilla = () => {
        const COLS = 13;
        const FILAS_EXTRA = 30;

        const encabezados = [
            'Nombre de la Materia',
            'Código',
            'Grupo',
            'Período Académico',
            'Año Académico',
            'Día 1',
            'Hora Inicio 1',
            'Hora Fin 1',
            'Día 2',
            'Hora Inicio 2',
            'Hora Fin 2',
            'Franja',
            'Programa',
        ];

        const filasDatos = cursos.map(c => [
            c.name || '',
            c.code || '',
            c.groupCode || '',
            c.academicPeriod || '',
            c.academicYear || '',
            c.dia || '',
            c.horaInicio || '',
            c.horaFin || '',
            c.dia2 || '',
            c.horaInicio2 || '',
            c.horaFin2 || '',
            c.franja || '',
            c.programa || '',
        ]);

        const colsTexto = new Set([5, 6, 7, 8, 9, 10]);

        const totalFilas = 1 + filasDatos.length + FILAS_EXTRA;
        const ws = {};

        encabezados.forEach((titulo, c) => {
            const ref = XLSX.utils.encode_cell({ r: 0, c });
            ws[ref] = { v: titulo, t: 's', z: '@' };
        });

        filasDatos.forEach((fila, ri) => {
            fila.forEach((valor, ci) => {
                const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
                ws[ref] = {
                    v: valor,
                    t: 's',
                    z: '@',
                };
            });
        });

        const inicioVacias = 1 + filasDatos.length;
        for (let ri = inicioVacias; ri < inicioVacias + FILAS_EXTRA; ri++) {
            for (let ci = 0; ci < COLS; ci++) {
                const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
                ws[ref] = {
                    v: '',
                    t: 's',
                    z: colsTexto.has(ci) ? '@' : '@',
                };
            }
        }

        ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totalFilas - 1, c: COLS - 1 });

        ws['!cols'] = [
            { wch: 32 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 14 },
            { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
            { wch: 14 }, { wch: 22 }, { wch: 32 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Materias');
        XLSX.writeFile(wb, `materias_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`${cursos.length} materia${cursos.length !== 1 ? 's' : ''} exportada${cursos.length !== 1 ? 's' : ''}`);
    };


    const claveDuplicado = (c) =>
        `${(c.code || '').toUpperCase()}|${(c.groupCode || '').toUpperCase()}|${c.dia || ''}|${c.horaInicio || ''}|${c.horaFin || ''}`;

    const manejarArchivoImportCurso = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        e.target.value = '';

        const lector = new FileReader();
        lector.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                const datos = filas.slice(1)
                    .filter(f => f[0] || f[1])
                    .map(f => ({
                        name:           String(f[0] || '').trim(),
                        code:           String(f[1] || '').trim().toUpperCase(),
                        groupCode:      String(f[2] || 'A').trim().toUpperCase(),
                        academicPeriod: String(f[3] || '1').trim(),
                        academicYear:   String(f[4] || new Date().getFullYear()).trim(),
                        dia:            String(f[5] || '').trim(),
                        horaInicio:     String(f[6] || '').trim(),
                        horaFin:        String(f[7] || '').trim(),
                        dia2:           String(f[8] || '').trim(),
                        horaInicio2:    String(f[9] || '').trim(),
                        horaFin2:       String(f[10] || '').trim(),
                        franja:         String(f[11] || '').trim(),
                        programa:       String(f[12] || '').trim(),
                    }));

                const clavesExistentes = new Set(cursos.map(claveDuplicado));
                const filasMarcadas = datos.map(fila => ({
                    ...fila,
                    esDuplicado: clavesExistentes.has(claveDuplicado(fila)),
                }));

                setFilasImportCurso(filasMarcadas);
                setModalImportCursoVisible(true);
            } catch {
                toast.error('Error al leer el archivo Excel');
            }
        };
        lector.readAsArrayBuffer(archivo);
    };

    const confirmarImportCursos = async () => {
        const nuevas = filasImportCurso.filter(f => !f.esDuplicado && f.name && f.code);
        if (nuevas.length === 0) {
            toast.error('No hay materias nuevas para importar');
            return;
        }
        setImportandoCursos(true);
        let creadas = 0;
        let errores = 0;
        for (const fila of nuevas) {
            try {
                await crearCurso(fila);
                creadas++;
            } catch {
                errores++;
            }
        }
        await cargarCursos();
        setModalImportCursoVisible(false);
        setFilasImportCurso([]);
        setImportandoCursos(false);
        if (creadas > 0) toast.success(`${creadas} materia${creadas !== 1 ? 's' : ''} importada${creadas !== 1 ? 's' : ''} correctamente`);
        if (errores > 0) toast.error(`${errores} materia${errores !== 1 ? 's' : ''} no pudieron importarse`);
    };

    return (
        <section className="space-y-6">
            {modalImportCursoVisible && (
                <div
                    className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(2px)' }}
                >
                    <div
                        className="modal-panel w-full max-w-4xl rounded-[var(--card-radius)] border flex flex-col"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '82vh' }}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                            <div>
                                <h3 className="text-lg font-semibold">Vista previa — Importación de Materias</h3>
                                <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    {filasImportCurso.filter(f => !f.esDuplicado).length} nueva{filasImportCurso.filter(f => !f.esDuplicado).length !== 1 ? 's' : ''} · 
                                    {filasImportCurso.filter(f => f.esDuplicado).length} duplicada{filasImportCurso.filter(f => f.esDuplicado).length !== 1 ? 's' : ''} (se omitirán)
                                </p>
                            </div>
                            <button type="button" onClick={() => setModalImportCursoVisible(false)} disabled={importandoCursos}
                                className="p-1.5 rounded-md transition-colors disabled:opacity-50" style={{ color: 'var(--color-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr style={{ background: 'var(--color-bg)' }}>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}></th>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Materia</th>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Código</th>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Grupo</th>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Período</th>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Horario</th>
                                        <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasImportCurso.map((f, i) => (
                                        <tr key={i} style={{ borderTop: '1px solid var(--color-border)', opacity: f.esDuplicado ? 0.45 : 1 }}>
                                            <td className="px-3 py-2">
                                                {f.esDuplicado
                                                    ? <AlertCircle size={15} style={{ color: 'var(--color-warning, #f59e0b)' }} />
                                                    : <CheckCircle2 size={15} style={{ color: 'var(--color-success, #22c55e)' }} />}
                                            </td>
                                            <td className="px-3 py-2 font-medium">{f.name}</td>
                                            <td className="px-3 py-2">{f.code}</td>
                                            <td className="px-3 py-2">{f.groupCode}</td>
                                            <td className="px-3 py-2">{f.academicPeriod} / {f.academicYear}</td>
                                            <td className="px-3 py-2 text-xs">
                                                {f.dia && f.horaInicio ? `${f.dia} ${f.horaInicio}–${f.horaFin}` : '—'}
                                                {f.dia2 && f.horaInicio2 ? ` · ${f.dia2} ${f.horaInicio2}–${f.horaFin2}` : ''}
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                                {f.esDuplicado
                                                    ? <span style={{ color: 'var(--color-warning, #f59e0b)' }}>Ya existe</span>
                                                    : <span style={{ color: 'var(--color-success, #22c55e)' }}>Nueva</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                            <button type="button" onClick={() => setModalImportCursoVisible(false)} disabled={importandoCursos} className="boton-secundario">Cancelar</button>
                            <button type="button" onClick={confirmarImportCursos} disabled={importandoCursos || filasImportCurso.filter(f => !f.esDuplicado).length === 0}
                                className="boton-primario inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {importandoCursos ? <><Loader2 size={15} className="animate-spin" /> Importando...</> : <><Upload size={15} /> Importar {filasImportCurso.filter(f => !f.esDuplicado).length} nueva{filasImportCurso.filter(f => !f.esDuplicado).length !== 1 ? 's' : ''}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <input ref={inputArchivoCursoRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={manejarArchivoImportCurso} />

            <header className="tarjeta flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Materias</h2>
                        <p className="mt-1 text-sm text-texto-secundario">Resumen de materias asignadas y su asistencia promedio.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                        {isAdmin && <FiltrosGlobales mostrarTodas={false} soloDocente={true} />}
                        
                        {!isAdmin && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalFormularioVisible(true)}
                                    className="boton-primario inline-flex items-center gap-2"
                                    title="Crear nueva asignación"
                                >
                                    <Plus size={16} />
                                    Nueva asignación
                                </button>
                                <button
                                    type="button"
                                    onClick={() => inputArchivoCursoRef.current?.click()}
                                    className="boton-secundario inline-flex items-center gap-2"
                                    title="Importar materias desde Excel"
                                >
                                    <Upload size={16} />
                                    Importar
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={exportarPlantilla}
                            className="boton-secundario inline-flex items-center gap-2"
                            title="Exportar materias a Excel"
                        >
                            <Download size={16} />
                            Exportar
                        </button>
                    </div>
                </div>
            </header>

            {modalFormularioVisible && (
                <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(2px)' }}>
                    <div className="modal-panel w-full max-w-4xl rounded-[var(--card-radius)] border flex flex-col" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '90vh' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                {cursoEnEdicion ? <Pencil size={20} className="text-primario" /> : <Plus size={20} className="text-primario" />}
                                {cursoEnEdicion ? 'Editar asignación' : 'Crear nueva asignación'}
                            </h3>
                            <button type="button" onClick={cancelarEdicion} disabled={guardandoCurso} className="p-1.5 rounded-md disabled:opacity-50" style={{ color: 'var(--color-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-auto flex-1 px-6 py-4">
                            <form id="form-curso" onSubmit={manejarEnvioCurso} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Programa</label>
                        <div className="relative">
                            <select
                                required
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.programa}
                                onChange={(e) => setFormularioCurso({
                                    ...formularioCurso,
                                    programa: e.target.value,
                                    name: '',
                                    code: '',
                                })}
                            >
                                <option value="">Seleccionar</option>
                                {[...new Set(catalogo.map(m => m.programa))].sort().map(prog => (
                                    <option key={prog} value={prog}>{prog}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Nombre de la materia</label>
                        <div className="relative">
                            <select
                                className="campo pr-8 w-full appearance-none"
                                value={formularioCurso.name}
                                required
                                disabled={!formularioCurso.programa}
                                onChange={(e) => {
                                    const seleccionada = catalogo.find(m => m.nombre === e.target.value);
                                    setFormularioCurso({
                                        ...formularioCurso,
                                        name: e.target.value,
                                        code: seleccionada ? seleccionada.codigo : '',
                                    });
                                }}
                            >
                                <option value="">{formularioCurso.programa ? 'Seleccionar materia...' : 'Primero seleccione un programa'}</option>
                                {catalogo
                                    .filter(m => m.programa === formularioCurso.programa)
                                    .map(m => (
                                        <option key={m.id} value={m.nombre}>
                                            {m.semestre ? `S${m.semestre} — ` : ''}{m.nombre}
                                        </option>
                                    ))}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Código</label>
                        <input
                            type="text"
                            required
                            placeholder="Se completa al elegir materia"
                            className="campo w-full uppercase"
                            value={formularioCurso.code}
                            readOnly={catalogo.some(m => m.nombre === formularioCurso.name)}
                            onChange={(e) => setFormularioCurso({ ...formularioCurso, code: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Franja</label>
                        <div className="relative">
                            <select
                                required
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.franja}
                                onChange={(e) => setFormularioCurso({
                                    ...formularioCurso,
                                    franja: e.target.value,
                                    horaInicio: '',
                                    horaFin: '',
                                    horaInicio2: '',
                                    horaFin2: '',
                                })}
                            >
                                <option value="">Seleccionar</option>
                                <option value="Diurna">Diurna</option>
                                <option value="Nocturna">Nocturna</option>
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Grupo</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej. A"
                            className="campo w-full uppercase"
                            value={formularioCurso.groupCode}
                            onChange={(e) => setFormularioCurso({ ...formularioCurso, groupCode: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Periodo</label>
                        <div className="relative">
                            <select
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.academicPeriod}
                                onChange={(e) => setFormularioCurso({ ...formularioCurso, academicPeriod: e.target.value })}
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Año</label>
                        <div className="relative">
                            <select
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.academicYear}
                                onChange={(e) => setFormularioCurso({ ...formularioCurso, academicYear: e.target.value })}
                            >
                                {Array.from({ length: 2051 - new Date().getFullYear() }, (_, i) => {
                                    const year = (new Date().getFullYear() + i).toString();
                                    return <option key={year} value={year}>{year}</option>;
                                })}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Día</label>
                        <div className="relative">
                            <select
                                required
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.dia}
                                onChange={(e) => setFormularioCurso({ ...formularioCurso, dia: e.target.value })}
                            >
                                <option value="">Seleccionar</option>
                                <option value="Lunes">Lunes</option>
                                <option value="Martes">Martes</option>
                                <option value="Miércoles">Miércoles</option>
                                <option value="Jueves">Jueves</option>
                                <option value="Viernes">Viernes</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Hora Inicio</label>
                        <div className="relative">
                            <select
                                required
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.horaInicio}
                                onChange={(e) => setFormularioCurso({ ...formularioCurso, horaInicio: e.target.value })}
                            >
                                <option value="">Seleccionar</option>
                                {horariosInicioOpciones.map(h => <option key={`ini-${h}`} value={h}>{h}</option>)}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-texto-secundario">Hora Fin</label>
                        <div className="relative">
                            <select
                                required
                                className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                value={formularioCurso.horaFin}
                                onChange={(e) => setFormularioCurso({ ...formularioCurso, horaFin: e.target.value })}
                            >
                                <option value="">Seleccionar</option>
                                {horariosFinOpciones.map(h => <option key={`fin-${h}`} value={h}>{h}</option>)}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                        </div>
                    </div>

                    {!mostrarSegundoDia ? (
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setMostrarSegundoDia(true)}
                                className="text-sm text-primario font-medium flex items-center gap-1 hover:underline h-[38px]"
                            >
                                <Plus size={16} /> Agregar día
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Día 2</label>
                                <div className="relative">
                                    <select
                                        className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                        value={formularioCurso.dia2}
                                        onChange={(e) => setFormularioCurso({ ...formularioCurso, dia2: e.target.value })}
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="Lunes">Lunes</option>
                                        <option value="Martes">Martes</option>
                                        <option value="Miércoles">Miércoles</option>
                                        <option value="Jueves">Jueves</option>
                                        <option value="Viernes">Viernes</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                    </select>
                                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Hora Inicio 2</label>
                                <div className="relative">
                                    <select
                                        className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                        value={formularioCurso.horaInicio2}
                                        onChange={(e) => setFormularioCurso({ ...formularioCurso, horaInicio2: e.target.value })}
                                    >
                                        <option value="">Seleccionar</option>
                                        {horariosInicioOpciones.map(h => <option key={`ini2-${h}`} value={h}>{h}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-texto-secundario">Hora Fin 2</label>
                                <div className="relative">
                                    <select
                                        className="campo pr-8 py-1.5 w-full appearance-none bg-white"
                                        value={formularioCurso.horaFin2}
                                        onChange={(e) => setFormularioCurso({ ...formularioCurso, horaFin2: e.target.value })}
                                    >
                                        <option value="">Seleccionar</option>
                                        {horariosFinOpciones.map(h => <option key={`fin2-${h}`} value={h}>{h}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario" />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMostrarSegundoDia(false);
                                        setFormularioCurso(p => ({ ...p, dia2: '', horaInicio2: '', horaFin2: '' }));
                                    }}
                                    className="text-sm text-red-500 font-medium hover:underline flex items-center gap-1 h-[38px]"
                                >
                                    <Trash2 size={16} /> Quitar día
                                </button>
                            </div>
                        </>
                    )}

                            </form>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                            <button type="button" onClick={cancelarEdicion} disabled={guardandoCurso} className="boton-secundario">Cancelar</button>
                            <button type="submit" form="form-curso" disabled={guardandoCurso} className="boton-primario inline-flex items-center gap-2 disabled:opacity-50">
                                {guardandoCurso ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : (cursoEnEdicion ? 'Actualizar' : 'Crear Materia')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(cargandoCursos || cargandoEstadisticas) && (
                    <p className="text-sm text-texto-secundario">Cargando...</p>
                )}

                {!cargandoCursos &&
                    !cargandoEstadisticas &&
                    estadisticasCursos.map((curso) => (
                        <article key={curso.id} className="tarjeta group relative min-w-0 overflow-hidden pb-14 min-h-[16rem] sm:min-h-[18rem]">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <div className="p-2 rounded-md bg-primario/10 flex items-center justify-center">
                                        <BookOpen size={18} className="text-primario" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{curso.nombre}</p>
                                        <div className="mt-1 text-xs text-texto-secundario">{curso.codigo} · Grupo {curso.grupo}</div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-start gap-2">
                                    <div className="periodo-badge" style={{ background: 'var(--color-accent)', color: 'white', borderColor: 'color-mix(in srgb, var(--color-accent) 90%, transparent)' }}>
                                        <span className="periodo-badge__text">P{curso.periodo}-{curso.anio}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-sm text-texto-secundario sm:grid-cols-2">
                                {isAdmin && (
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-texto-secundario">Docente</p>
                                        <p className="font-medium text-texto flex items-center gap-1">
                                            <User size={14} className="text-primario" />
                                            {curso.profesor}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-texto-secundario">Programa</p>
                                    <p className="font-medium text-texto">{curso.programa}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-texto-secundario">Franja</p>
                                    <p className="text-texto">{curso.franja}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-texto-secundario">Horario</p>
                                    <p className="text-texto">{curso.horario}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div />
                            </div>

                            {!isAdmin && (
                                <div className="absolute left-3 bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button
                                        onClick={() => iniciarEdicionCurso(curso)}
                                        className="p-1.5 text-texto-secundario hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Editar materia"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => manejarEliminacionCurso(curso.id, curso.nombre)}
                                        disabled={eliminandoId === curso.id}
                                        className="p-1.5 text-texto-secundario hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                        title="Eliminar materia"
                                    >
                                        {eliminandoId === curso.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            )}

                            <div className="absolute right-3 bottom-3 z-10">
                                <div className="rounded-md px-3 py-1 bg-acento/10 border border-acento/20">
                                    <span className="font-mono font-semibold text-lg text-acento">{curso.porcentaje.toLocaleString('es-CO')}%</span>
                                </div>
                            </div>
                        </article>
                    ))}

                {!cargandoCursos && !cargandoEstadisticas && estadisticasCursos.length === 0 && (
                    <p className="text-sm text-texto-secundario">No hay materias registradas.</p>
                )}
            </section>
        </section>
    );
}
