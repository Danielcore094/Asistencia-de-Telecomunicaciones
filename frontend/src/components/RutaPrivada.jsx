import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../context/ContextoAutenticacion';
import { Loader2 } from 'lucide-react';

export default function RutaPrivada({ children }) {
    const { usuario, cargando } = useAutenticacion();

    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
                <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={48} />
            </div>
        );
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
