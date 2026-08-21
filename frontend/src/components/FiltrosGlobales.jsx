import { useEffect, useMemo, useState } from 'react';
import { useCurso } from '../context/ContextoCurso';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import { obtenerDocentes } from '../services/api';

const estiloSelector = {
    height: '36px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--input-radius)',
    padding: '0 28px 0 10px',
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-sans)',
    fontWeight: '500',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    appearance: 'none',
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast)',
    outline: 'none',
    minWidth: '140px',
    maxWidth: '400px',
    width: 'auto',
    textOverflow: 'ellipsis',
};

const estiloLabel = {
    fontSize: '0.8125rem',
    fontWeight: '500',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
};

function ChevronAbajo() {
    return (
        <svg
            style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--color-muted)',
            }}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function SelectorFiltro({ label, id, value, onChange, children }) {
    return (
        <div className="filtro-global">
            <label htmlFor={id} style={estiloLabel}>
                {label}
            </label>

            <div className="filtro-global__control">
                <select
                    id={id}
                    value={value ?? ''}
                    onChange={onChange}
                    style={estiloSelector}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-primary)';
                        e.target.style.boxShadow =
                            '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'var(--color-border)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    {children}
                </select>

                <ChevronAbajo />
            </div>
        </div>
    );
}

export default function FiltrosGlobales({
    soloMateria = false,
    filtroDia = null,
    mostrarTodas = true,
    soloDocente = false,
}) {
    const { usuario } = useAutenticacion();
    const isAdmin = usuario?.role === 'ADMIN';

    const {
        cursos,
        cursoSeleccionado,
        seleccionarCurso,
        cargandoCursos,
        grupoSeleccionado,
        setGrupoSeleccionado,
        docenteSeleccionado,
        setDocenteSeleccionado,
    } = useCurso();

    const [docentes, setDocentes] = useState([]);

    useEffect(() => {
        if (isAdmin) {
            obtenerDocentes().then(lista => {
                setDocentes(lista);
                if (!docenteSeleccionado && lista.length > 0) {
                    setDocenteSeleccionado(lista[0].id);
                }
            }).catch(console.error);
        }
    }, [isAdmin, docenteSeleccionado, setDocenteSeleccionado]);

    const cursosFiltrados = useMemo(() => {
        if (!filtroDia) return cursos;

        return cursos.filter(
            (c) => c.dia === filtroDia || c.dia2 === filtroDia
        );
    }, [cursos, filtroDia]);

    const nombresUnicos = useMemo(() => {
        const vistos = new Set();

        return cursosFiltrados.filter((c) => {
            const nombre = (c.name || c.nombre || '').trim();
            if (!nombre || vistos.has(nombre)) return false;

            vistos.add(nombre);
            return true;
        });
    }, [cursosFiltrados]);

    const gruposDisponibles = useMemo(() => {
        if (!cursoSeleccionado) return [];

        const nombreActual = (cursoSeleccionado.name || cursoSeleccionado.nombre || '').trim().toLowerCase();

        return cursosFiltrados
            .filter((c) => {
                const nombreCurso = (c.name || c.nombre || '').trim().toLowerCase();
                return nombreCurso === nombreActual;
            })
            .map(c => ({
                ...c,
                groupCode: c.groupCode || c.grupo || 'Sin grupo'
            }))
            .sort((a, b) =>
                String(a.groupCode).localeCompare(String(b.groupCode))
            );
    }, [cursosFiltrados, cursoSeleccionado]);

    useEffect(() => {
        if (filtroDia && cursosFiltrados.length > 0) {
            const isSelectedValid =
                cursoSeleccionado &&
                cursosFiltrados.some(
                    (c) => c.id === cursoSeleccionado.id
                );

            if (!isSelectedValid) {
                const debeSeleccionarPrimero = !(
                    cursoSeleccionado === null &&
                    mostrarTodas
                );

                if (debeSeleccionarPrimero) {
                    seleccionarCurso(cursosFiltrados[0]);
                }
            }
        }
    }, [
        filtroDia,
        cursosFiltrados,
        cursoSeleccionado,
        seleccionarCurso,
        isAdmin,
        mostrarTodas,
    ]);

    const gruposDisponiblesKey = gruposDisponibles
        .map((g) => g.groupCode)
        .join(',');

    useEffect(() => {
        if (!cursoSeleccionado || soloDocente) return;

        if (gruposDisponibles.length === 0) {
            if (grupoSeleccionado !== null) setGrupoSeleccionado(null);
            return;
        }

        const existe = gruposDisponibles.some(
            (g) => g.groupCode === grupoSeleccionado
        );

        if (!existe) {
            const primerGrupo = gruposDisponibles[0];
            
            if (grupoSeleccionado !== primerGrupo.groupCode) {
                setGrupoSeleccionado(primerGrupo.groupCode);
            }
            if (cursoSeleccionado.id !== primerGrupo.id) {
                seleccionarCurso(primerGrupo);
            }
        }
    }, [
        gruposDisponiblesKey,
        gruposDisponibles,
        grupoSeleccionado,
        setGrupoSeleccionado,
        seleccionarCurso,
        cursoSeleccionado,
        soloDocente
    ]);

    const handleCambioMateria = (e) => {
        const selectedName = e.target.value;
        if (selectedName === 'TODAS') {
            seleccionarCurso(null);
            setGrupoSeleccionado(null);
            return;
        }

        const cursosMateria = cursosFiltrados
            .filter((c) => {
                const nombreCurso = (c.name || c.nombre || '').trim().toLowerCase();
                const nombreBuscado = selectedName.trim().toLowerCase();
                return nombreCurso === nombreBuscado;
            })
            .sort((a, b) =>
                String(a.groupCode || a.grupo || '').localeCompare(
                    String(b.groupCode || b.grupo || '')
                )
            );

        const primerCurso = cursosMateria[0];

        if (primerCurso) {
            seleccionarCurso(primerCurso);
            setGrupoSeleccionado(primerCurso.groupCode);
        }
    };

    const handleCambioGrupo = (e) => {
        const cursoDelGrupo = gruposDisponibles.find(
            (c) => c.groupCode === e.target.value
        );

        if (cursoDelGrupo) {
            seleccionarCurso(cursoDelGrupo);
            setGrupoSeleccionado(cursoDelGrupo.groupCode);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
            }}
        >
            {isAdmin && (
                <SelectorFiltro
                    label="Docente:"
                    id="selector-docente"
                    value={docenteSeleccionado || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        setDocenteSeleccionado(val);
                        seleccionarCurso(null);
                    }}
                >
                    {docentes.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </SelectorFiltro>
            )}

            {!soloDocente && (
                <>
                    {cargandoCursos ? (
                        <span
                            style={{
                                ...estiloLabel,
                                color: 'var(--color-muted)',
                            }}
                        >
                            Cargando...
                        </span>
                    ) : nombresUnicos?.length > 0 || isAdmin ? (
                        <SelectorFiltro
                            label="Materia activa:"
                            id="selector-materia"
                            value={
                                cursoSeleccionado
                                    ? cursoSeleccionado.name
                                    : mostrarTodas
                                    ? 'TODAS'
                                    : ''
                            }
                            onChange={handleCambioMateria}
                        >
                                            {mostrarTodas && (
                                <option value="TODAS">
                                    Todas las materias
                                </option>
                            )}

                            {nombresUnicos.map((curso) => (
                                <option
                                    key={curso.id}
                                    value={curso.name || curso.nombre}
                                >
                                    {curso.name || curso.nombre}
                                </option>
                            ))}
                        </SelectorFiltro>
                    ) : (
                        <span
                            style={{
                                ...estiloLabel,
                                fontStyle: 'italic',
                            }}
                        >
                            Sin materias para este día
                        </span>
                    )}

                    {cursoSeleccionado && (
                        <SelectorFiltro
                            label="Grupo:"
                            id="selector-group"
                            value={grupoSeleccionado || (gruposDisponibles[0]?.groupCode)}
                            onChange={handleCambioGrupo}
                        >
                            {gruposDisponibles.map((c) => (
                                <option
                                    key={c.id}
                                    value={c.groupCode}
                                >
                                    {c.groupCode}
                                </option>
                            ))}
                        </SelectorFiltro>
                    )}
                </>
            )}
        </div>
    );
}
``