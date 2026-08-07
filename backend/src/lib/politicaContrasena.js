const patronContrasenaSegura = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const obtenerErrorContrasena = (contrasena) => {
    if (typeof contrasena !== 'string' || contrasena.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres'
    }

    if (contrasena.length > 128) {
        return 'La contraseña no puede superar 128 caracteres'
    }

    if (!patronContrasenaSegura.test(contrasena)) {
        return 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales'
    }

    return null
}