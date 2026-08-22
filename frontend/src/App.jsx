import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import EnrutadorApp from './router.jsx';
import { ProveedorAutenticacion } from './context/ContextoAutenticacion.jsx';
import { ProveedorCurso } from './context/ContextoCurso.jsx';

function App() {
    return (
        <BrowserRouter>
            <ProveedorAutenticacion>
                <ProveedorCurso>
                    <EnrutadorApp />
                </ProveedorCurso>
            </ProveedorAutenticacion>
            <Analytics />
        </BrowserRouter>
    )
}

export default App;
