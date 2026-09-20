interface EstadoConOrigen {
  from?: { pathname?: string }
}

/**
 * Ruta a la que volver después de loguearse o completar datos: la que dejó
 * ClienteProtectedRoute en `location.state.from`, o `porDefecto` si el
 * usuario llegó directo. Solo se conserva el pathname.
 */
export function destinoOriginal(state: unknown, porDefecto: string): string {
  const pathname = (state as EstadoConOrigen | null)?.from?.pathname
  return typeof pathname === 'string' ? pathname : porDefecto
}
