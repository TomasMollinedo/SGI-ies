import type { Cliente } from '@/features/ecommerce/types/cliente.types'

/**
 * Sin DNI/CUIT o sin teléfono el backend rechaza la declaración con un 400:
 * se usa para mandar al cliente a completarlos antes (mismo criterio que
 * `ClienteProtectedRoute` con `requiereDatosCompletos`).
 */
export function tieneDatosIncompletos(cliente: Cliente | null | undefined): boolean {
  if (!cliente) return false
  return cliente.dni_cuil === null || cliente.telefono === null
}
