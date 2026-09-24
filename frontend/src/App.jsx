import { BrowserRouter } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import EnrutadorApp from './router.jsx';
import { ProveedorAutenticacion } from './context/ContextoAutenticacion.jsx';
import { ProveedorCurso } from './context/ContextoCurso.jsx';

function App() {
    return (
        <BrowserRouter>
            <ProveedorAutenticacion>
                <ProveedorCurso>
                    <EnrutadorApp />
                    <SpeedInsights />
                </ProveedorCurso>
            </ProveedorAutenticacion>
        </BrowserRouter>
    )
}

export default App;
