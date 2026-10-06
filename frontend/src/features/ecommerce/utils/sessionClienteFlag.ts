const CLAVE = 'ies:sesion-cliente'

/*
 * Bandera de "este navegador ya tuvo una sesión de cliente". Guarda solo un
 * '1': nunca el token ni datos del cliente. Sirve para no consultar
 * /cliente/me (y disparar un refresh) en cada visita de alguien que nunca
 * inició sesión. Todo va en try/catch porque localStorage puede tirar en
 * navegación privada o con el storage bloqueado.
 */

export function marcarSesionCliente(): void {
  try {
    localStorage.setItem(CLAVE, '1')
  } catch {
    // Sin storage no hay bandera: el cliente queda como visitante al recargar.
  }
}

export function limpiarSesionCliente(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que limpiar si el storage no está disponible.
  }
}

export function haySesionClientePrevia(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== null
  } catch {
    return false
  }
}
