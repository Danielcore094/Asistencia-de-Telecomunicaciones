import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
    LayoutDashboard,
    ClipboardCheck,
    Users,
    BookOpen,
    BarChart3,
    Settings,
    LogOut,
    History,
    User,
    ChevronDown,
    ShieldCheck,
    Library
} from 'lucide-react';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import { useCurso } from '../context/ContextoCurso';

const elementosNavegacion = [
    { ruta: '/', etiqueta: 'Panel Principal', icono: LayoutDashboard },
    { ruta: '/cursos', etiqueta: 'Materias', icono: BookOpen },
    { ruta: '/catalogo-materias', etiqueta: 'Catálogo', icono: Library, adminOnly: true },
    { ruta: '/estudiantes', etiqueta: 'Estudiantes', icono: Users },
    { ruta: '/asistencia', etiqueta: 'Asistencia', icono: ClipboardCheck, docenteOnly: true },
    { ruta: '/historial', etiqueta: 'Historial', icono: History },
    { ruta: '/reportes', etiqueta: 'Reportes', icono: BarChart3 },
    { ruta: '/auditoria', etiqueta: 'Auditoría', icono: ShieldCheck, adminOnly: true },
    { ruta: '/configuracion', etiqueta: 'Configuración', icono: Settings, adminOnly: true },
];

export default function LayoutPrincipal({ children }) {
    const ubicacion = useLocation();
    const navegar = useNavigate();
    const { cerrarSesion, usuario } = useAutenticacion();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    const manejarCierreSesion = () => {
        cerrarSesion();
        navegar('/login');
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuAbierto(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="min-h-screen bg-beige text-texto">

            <header
                className="fixed left-0 right-0 top-0 z-20 border-b topbar-bg"
                style={{ minHeight: 'var(--topbar-height)' }}
            >
                <div
                    className="mx-auto flex w-full min-w-0 items-center px-3 md:px-8"
                    style={{
                        maxWidth: 'var(--content-max-width)',
                        minHeight: 'var(--topbar-height)',
                        gap: 'var(--space-4)',
                    }}
                >
                    <div className="relative h-14 w-36 shrink-0 overflow-hidden sm:w-44 md:w-52">
                        <img
                            src="/logo.png"
                            alt="Logo UTS"
                            className="absolute left-1/2 top-1/2 h-auto w-36 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-sm sm:w-44 md:w-52"
                        />
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden xl:block">
                        <h1 className="text-xl font-bold text-primario">
                            Control de Asistencia Telecomunicaciones
                        </h1>
                    </div>

                    <div className="min-w-0 flex-1 px-2 text-center xl:hidden">
                        <h1 className="truncate text-sm font-bold text-primario sm:text-base">
                            Control de Asistencia
                        </h1>
                    </div>
                    <div className="relative ml-auto flex shrink-0 items-center" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuAbierto(!menuAbierto)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-fondo sm:gap-2 sm:px-3"
                            aria-haspopup="true"
                            aria-expanded={menuAbierto}
                            aria-label="Menú de usuario"
                        >
                            <User size={18} className="text-texto-secundario" aria-label="Cuenta" />
                            <span className="hidden sm:inline font-medium text-texto">
                                {usuario?.name || 'Cuenta activa'}
                            </span>
                            <ChevronDown size={14} className="text-texto-secundario" aria-label="Abrir menú" />
                        </button>

                        {menuAbierto && (
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-borde bg-superficie shadow-lg overflow-hidden py-1">
                                <Link
                                    to="/perfil"
                                    onClick={() => setMenuAbierto(false)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-texto hover:bg-fondo transition-colors"
                                >
                                    <Settings size={16} className="text-texto-secundario" />
                                    <span>Editar Perfil</span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuAbierto(false);
                                        manejarCierreSesion();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <LogOut size={16} />
                                    <span>Salir</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>


            <aside className="sidebar-nav fixed bottom-0 left-0 top-topbar z-10 hidden w-sidebar border-r md:block">
                <nav className="flex h-full flex-col px-3 pt-24 pb-4">
                    <ul className="space-y-1">
                        {elementosNavegacion
                            .filter((item) => {
                                if (item.adminOnly && usuario?.role !== 'ADMIN') return false;
                                if (item.docenteOnly && usuario?.role === 'ADMIN') return false;
                                return true;
                            })
                            .map((item) => {
                                const Icono = item.icono;
                                const activo = ubicacion.pathname === item.ruta;
                                return (
                                    <li key={item.ruta}>
                                        <Link
                                            to={item.ruta}
                                            className={`nav-item ${activo ? 'activo' : ''}`}
                                        >
                                            <Icono size={18} aria-label={item.etiqueta} />
                                            <span>{item.etiqueta}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                    </ul>
                </nav>
            </aside>


            <main className="min-w-0 px-3 pb-36 pt-[calc(var(--topbar-height)+var(--space-6))] sm:px-4 md:pb-8 md:pl-[calc(var(--sidebar-width)+var(--space-8))] md:pr-8 md:pt-[calc(var(--topbar-height)+var(--space-8))]">
                <div className="mx-auto w-full min-w-0 max-w-[var(--content-max-width)]">
                    {children}
                </div>
            </main>


            <nav className="fixed bottom-0 left-0 right-0 z-20 border-t topbar-bg md:hidden">
                <ul
                    className={`grid ${
                        usuario?.role === 'ADMIN' ? 'grid-cols-4' : 'grid-cols-3'
                    }`}
                >
                    {elementosNavegacion
                        .filter((item) => {
                            if (item.adminOnly && usuario?.role !== 'ADMIN') return false;
                            if (item.docenteOnly && usuario?.role === 'ADMIN') return false;
                            return true;
                        })
                        .map((item) => {
                            const Icono = item.icono;
                            const activo = ubicacion.pathname === item.ruta;
                            return (
                                <li key={item.ruta} className="min-w-0">
                                    <Link
                                        to={item.ruta}
                                        className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px] ${
                                            activo ? 'text-primario' : 'text-texto-secundario'
                                        }`}
                                    >
                                        <Icono size={18} aria-label={item.etiqueta} />
                                        <span className="w-full truncate text-center">{item.etiqueta}</span>
                                    </Link>
                                </li>
                            );
                        })}
                </ul>
            </nav>
        </div>
    );
}
