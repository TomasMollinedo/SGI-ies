import type { ClienteVenta } from '../types/venta.types'

/**
 * DNI (7-8 dígitos) o CUIT/CUIL (11 dígitos), sin puntos ni guiones — mismo
 * criterio que `validarDniCuilValido` del backend. Exportado para que
 * `BuscadorCliente` lo use también en el cartel de error del campo.
 */
export const DNI_CUIL_REGEX = /^(\d{7,8}|\d{11})$/

/** Exportados para que `BuscadorCliente` los use también en sus carteles de error. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const TELEFONO_REGEX = /^\d+$/

/** Los 4 campos que `create-venta.dto.ts` exige siempre, sea el cliente nuevo o ya existente. */
export function clienteVentaValido(cliente: ClienteVenta | null): cliente is ClienteVenta {
  if (cliente === null) return false
  return (
    cliente.nombre.trim() !== '' &&
    DNI_CUIL_REGEX.test(cliente.dni_cuil.trim()) &&
    EMAIL_REGEX.test(cliente.email.trim()) &&
    TELEFONO_REGEX.test(cliente.telefono.trim())
  )
}
