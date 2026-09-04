import { useDeferredValue, useEffect, useState } from 'react';
import { BookOpen, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import {
    actualizarMateriaCatalogo,
    crearMateriaCatalogo,
    eliminarMateriaCatalogo,
    obtenerCatalogoMaterias,
} from '../services/api';

const formularioInicial = {
    codigo: '',
    nombre: '',
    programa: '',
    semestre: '',
};

export default function CatalogoMaterias() {
    const { usuario } = useAutenticacion();
    const [materias, setMaterias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [editandoId, setEditandoId] = useState(null);
    const [formulario, setFormulario] = useState(formularioInicial);
    const [busqueda, setBusqueda] = useState('');
    const busquedaDiferida = useDeferredValue(busqueda.trim().toLowerCase());

    const cargarCatalogo = async () => {
        setCargando(true);
        try {
            setMaterias(await obtenerCatalogoMaterias());
        } catch {
            toast.error('Error al cargar el catálogo de materias');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarCatalogo();
    }, []);

    const materiasFiltradas = materias.filter((materia) => {
        if (!busquedaDiferida) return true;
        return [materia.codigo, materia.nombre, materia.programa, materia.semestre]
            .some((valor) => String(valor ?? '').toLowerCase().includes(busquedaDiferida));
    });

    const cancelarEdicion = () => {
        setEditandoId(null);
        setFormulario(formularioInicial);
    };

    const iniciarEdicion = (materia) => {
        setEditandoId(materia.id);
        setFormulario({
            codigo: materia.codigo,
            nombre: materia.nombre,
            programa: materia.programa,
            semestre: materia.semestre ?? '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const manejarEnvio = async (evento) => {
        evento.preventDefault();
        setGuardando(true);
        try {
            if (editandoId) {
                const actualizada = await actualizarMateriaCatalogo(editandoId, formulario);
                setMaterias((anteriores) => anteriores.map((materia) => (
                    materia.id === editandoId ? actualizada : materia
                )));
                toast.success('Materia actualizada correctamente');
            } else {
                const creada = await crearMateriaCatalogo(formulario);
                setMaterias((anteriores) => [...anteriores, creada]);
                toast.success('Materia añadida al catálogo');
            }
            cancelarEdicion();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No fue posible guardar la materia');
        } finally {
            setGuardando(false);
        }
    };

    const manejarEliminacion = async (materia) => {
        if (!confirm(`¿Eliminar "${materia.nombre}" del catálogo?`)) return;

        setEliminandoId(materia.id);
        try {
            await eliminarMateriaCatalogo(materia.id);
            setMaterias((anteriores) => anteriores.filter((actual) => actual.id !== materia.id));
            if (editandoId === materia.id) cancelarEdicion();
            toast.success('Materia eliminada del catálogo');
        } catch (error) {
            toast.error(error.response?.data?.error || 'No fue posible eliminar la materia');
        } finally {
            setEliminandoId(null);
        }
    };

    if (usuario?.role !== 'ADMIN') {
        return (
            <section className="superficie p-6">
                <h2 className="text-xl font-semibold">Acceso no autorizado</h2>
                <p className="mt-2 text-sm text-texto-secundario">Solo los administradores pueden gestionar el catálogo de materias.</p>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                    <div className="flex items-center gap-2">
                        <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
                        <h2 className="text-2xl font-semibold">Catálogo de materias</h2>
                    </div>
                    <p className="mt-1 text-sm text-texto-secundario">Administra las materias disponibles para nuevas asignaciones docentes.</p>
                </div>
                <span className="text-sm font-medium text-texto-secundario">
                    {materias.length} materia{materias.length === 1 ? '' : 's'}
                </span>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
                <div className="superficie self-start p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{editandoId ? 'Editar materia' : 'Añadir materia'}</h3>
                        {editandoId && (
                            <button
                                type="button"
                                onClick={cancelarEdicion}
                                className="rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2"
                                style={{ color: 'var(--color-muted)' }}
                                aria-label="Cancelar edición"
                                title="Cancelar edición"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <form onSubmit={manejarEnvio} className="space-y-4">
                        <div>
                            <label htmlFor="codigo-materia" className="mb-1 block text-sm font-medium">Código</label>
                            <input
                                id="codigo-materia"
                                className="campo w-full uppercase"
                                value={formulario.codigo}
                                onChange={(evento) => setFormulario((actual) => ({ ...actual, codigo: evento.target.value }))}
                                placeholder="Ej. TEL101"
                                maxLength={30}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="nombre-materia" className="mb-1 block text-sm font-medium">Nombre</label>
                            <input
                                id="nombre-materia"
                                className="campo w-full"
                                value={formulario.nombre}
                                onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))}
                                placeholder="Nombre de la materia"
                                maxLength={200}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="programa-materia" className="mb-1 block text-sm font-medium">Programa</label>
                            <input
                                id="programa-materia"
                                className="campo w-full"
                                value={formulario.programa}
                                onChange={(evento) => setFormulario((actual) => ({ ...actual, programa: evento.target.value }))}
                                placeholder="Programa académico"
                                maxLength={200}
                                list="programas-catalogo"
                                required
                            />
                            <datalist id="programas-catalogo">
                                {[...new Set(materias.map((materia) => materia.programa))].sort().map((programa) => (
                                    <option key={programa} value={programa} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label htmlFor="semestre-materia" className="mb-1 block text-sm font-medium">Semestre</label>
                            <input
                                id="semestre-materia"
                                type="number"
                                className="campo w-full"
                                value={formulario.semestre}
                                onChange={(evento) => setFormulario((actual) => ({ ...actual, semestre: evento.target.value }))}
                                placeholder="Opcional"
                                min="1"
                                max="10"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            {editandoId && (
                                <button type="button" onClick={cancelarEdicion} className="boton-secundario flex-1">
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" disabled={guardando} className="boton-primario inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                                {guardando ? <Loader2 size={16} className="animate-spin" /> : editandoId ? <Pencil size={16} /> : <Plus size={16} />}
                                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Añadir'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="min-w-0">
                    <div className="relative mb-4">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                        <input
                            type="search"
                            className="campo w-full pl-10"
                            value={busqueda}
                            onChange={(evento) => setBusqueda(evento.target.value)}
                            placeholder="Buscar por código, nombre, programa o semestre"
                            aria-label="Buscar materias"
                        />
                    </div>

                    <div className="superficie overflow-hidden">
                        {cargando ? (
                            <div className="flex items-center justify-center gap-2 p-12 text-sm text-texto-secundario">
                                <Loader2 size={18} className="animate-spin" />
                                Cargando...
                            </div>
                        ) : materiasFiltradas.length === 0 ? (
                            <div className="p-12 text-center text-sm text-texto-secundario">
                                {busquedaDiferida ? 'No se encontraron materias con esa búsqueda.' : 'No hay materias registradas en el catálogo.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-sm">
                                    <thead style={{ background: 'var(--color-bg)' }}>
                                        <tr className="text-left text-texto-secundario">
                                            <th className="px-4 py-2 font-medium">Código</th>
                                            <th className="px-4 py-2 font-medium">Materia</th>
                                            <th className="px-4 py-2 font-medium">Programa</th>
                                            <th className="px-4 py-2 text-center font-medium">Semestre</th>
                                            <th className="px-4 py-2 text-right font-medium">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materiasFiltradas.map((materia) => (
                                            <tr key={materia.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                                <td className="px-4 py-2 font-mono font-medium">{materia.codigo}</td>
                                                <td className="px-4 py-2 font-medium">{materia.nombre}</td>
                                                <td className="px-4 py-2 text-texto-secundario">{String(materia.programa || '').toUpperCase()}</td>
                                                <td className="px-4 py-2 text-center font-mono">{materia.semestre ?? '—'}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => iniciarEdicion(materia)}
                                                            className="rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2"
                                                            style={{ color: 'var(--color-primary)' }}
                                                            aria-label={`Editar ${materia.nombre}`}
                                                            title="Editar materia"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => manejarEliminacion(materia)}
                                                            disabled={eliminandoId === materia.id}
                                                            className="rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
                                                            style={{ color: 'var(--color-primary-dark)' }}
                                                            aria-label={`Eliminar ${materia.nombre}`}
                                                            title="Eliminar materia"
                                                        >
                                                            {eliminandoId === materia.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}