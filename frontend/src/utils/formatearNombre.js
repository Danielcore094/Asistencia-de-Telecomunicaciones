export function formatearNombre(nombre = '') {
    const partes = nombre.trim().split(/\s+/);
    if (partes.length <= 1) return nombre;
    if (partes.length === 2) return `${partes[1]}, ${partes[0]}`;

    const apellidos = partes.slice(-2).join(' ');
    const nombres   = partes.slice(0, -2).join(' ');
    return `${apellidos}, ${nombres}`;
}

export function claveOrdenNombre(nombre = '') {
    const partes = nombre.trim().split(/\s+/);
    if (partes.length < 2) return nombre.toLowerCase();
    return partes[partes.length - 2].toLowerCase();
}

export function compararPorApellido(a, b) {
    return claveOrdenNombre(a).localeCompare(claveOrdenNombre(b), 'es', { sensitivity: 'base' });
}
