const DOMINIOS_INSTITUCIONALES = ['correo.uts.edu.co', 'uts.edu.co']

export function normalizarCorreo(valor) {
    if (typeof valor !== 'string') return null
    const correo = valor.trim().toLowerCase()
    return correo || null
}

export function esCorreoInstitucional(valor) {
    const correo = normalizarCorreo(valor)
    if (!correo || correo.length > 254) return false

    const separador = correo.lastIndexOf('@')
    if (separador <= 0) return false

    const dominio = correo.slice(separador + 1)
    return DOMINIOS_INSTITUCIONALES.includes(dominio)
}

export const MENSAJE_CORREO_INSTITUCIONAL =
    'El correo debe tener un dominio @correo.uts.edu.co o @uts.edu.co'