import { useEffect, useRef, useState } from 'react';

const URL_SCRIPT_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const ID_SCRIPT_TURNSTILE = 'script-turnstile';

export default function CaptchaTurnstile({ alVerificar, alExpirar, alError }) {
    const referenciaContenedor = useRef(null);
    const referenciaWidget = useRef(null);
    const referenciasCallbacks = useRef({ alVerificar, alExpirar, alError });
    const [cargando, setCargando] = useState(true);
    const clavePublica = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    referenciasCallbacks.current = { alVerificar, alExpirar, alError };

    useEffect(() => {
        if (!clavePublica) {
            setCargando(false);
            referenciasCallbacks.current.alError('El CAPTCHA no está configurado');
            return undefined;
        }

        let desmontado = false;
        const renderizarWidget = () => {
            if (desmontado || !referenciaContenedor.current || !window.turnstile) return;

            referenciaWidget.current = window.turnstile.render(referenciaContenedor.current, {
                sitekey: clavePublica,
                theme: 'light',
                callback: token => referenciasCallbacks.current.alVerificar(token),
                'expired-callback': () => referenciasCallbacks.current.alExpirar(),
                'error-callback': () => referenciasCallbacks.current.alError('No fue posible validar el CAPTCHA'),
            });
            setCargando(false);
        };

        const scriptExistente = document.getElementById(ID_SCRIPT_TURNSTILE);
        if (window.turnstile) {
            renderizarWidget();
        } else if (scriptExistente) {
            scriptExistente.addEventListener('load', renderizarWidget);
        } else {
            const script = document.createElement('script');
            script.id = ID_SCRIPT_TURNSTILE;
            script.src = URL_SCRIPT_TURNSTILE;
            script.async = true;
            script.defer = true;
            script.addEventListener('load', renderizarWidget);
            script.addEventListener('error', () => {
                setCargando(false);
                referenciasCallbacks.current.alError('No fue posible cargar el CAPTCHA');
            });
            document.head.appendChild(script);
        }

        return () => {
            desmontado = true;
            if (scriptExistente) scriptExistente.removeEventListener('load', renderizarWidget);
            if (referenciaWidget.current && window.turnstile) {
                window.turnstile.remove(referenciaWidget.current);
            }
        };
    }, [clavePublica]);

    if (!clavePublica) {
        return <p className="text-sm text-red-600">El CAPTCHA no está configurado.</p>;
    }

    return (
        <div className="min-h-[65px]" aria-busy={cargando}>
            <div ref={referenciaContenedor} />
            {cargando && <p className="mt-2 text-xs text-texto-secundario">Cargando verificación...</p>}
        </div>
    );
}
