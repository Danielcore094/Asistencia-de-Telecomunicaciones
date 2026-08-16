import { Routes, Route, Navigate } from 'react-router-dom';
import Inicio from './pages/Inicio.jsx';
import Materias from './pages/Materias.jsx';
import CatalogoMaterias from './pages/CatalogoMaterias.jsx';
import Estudiantes from './pages/Estudiantes.jsx';
import Asistencia from './pages/Asistencia.jsx';
import Historial from './pages/Historial.jsx';
import Reportes from './pages/Reportes.jsx';
import Configuracion from './pages/Configuracion.jsx';
import Perfil from './pages/Perfil.jsx';
import Auditoria from './pages/Auditoria.jsx';
import InicioSesion from './pages/InicioSesion.jsx';
import RecuperarContrasena from './pages/RecuperarContrasena.jsx';
import RestablecerContrasena from './pages/RestablecerContrasena.jsx';
import RutaPrivada from './components/RutaPrivada.jsx';
import LayoutPrincipal from './components/LayoutPrincipal.jsx';

export default function EnrutadorApp() {
    return (
        <Routes>
            <Route path="/login" element={<InicioSesion />} />
            <Route path="/forgot-password" element={<RecuperarContrasena />} />
            <Route path="/reset-password" element={<RestablecerContrasena />} />
            <Route
                path="/*"
                element={
                    <RutaPrivada>
                        <LayoutPrincipal>
                            <Routes>
                                <Route path="/" element={<Inicio />} />
                                <Route path="/cursos" element={<Materias />} />
                                <Route path="/catalogo-materias" element={<CatalogoMaterias />} />
                                <Route path="/estudiantes" element={<Estudiantes />} />
                                <Route path="/asistencia" element={<Asistencia />} />
                                <Route path="/historial" element={<Historial />} />
                                <Route path="/reportes" element={<Reportes />} />
                                <Route path="/auditoria" element={<Auditoria />} />
                                <Route path="/configuracion" element={<Configuracion />} />
                                <Route path="/perfil" element={<Perfil />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </LayoutPrincipal>
                    </RutaPrivada>
                }
            />
        </Routes>
    );
}
