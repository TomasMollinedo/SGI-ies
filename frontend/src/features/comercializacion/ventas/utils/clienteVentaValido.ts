import type { ClienteVenta } from '../types/venta.types'

/** DNI (7-8 dígitos) o CUIT/CUIL (11 dígitos), sin puntos ni guiones — mismo criterio que `validarDniCuilValido` del backend. */
const DNI_CUIL_REGEX = /^(\d{7,8}|\d{11})$/

/** Los 4 campos que `create-venta.dto.ts` exige siempre, sea el cliente nuevo o ya existente. */
export function clienteVentaValido(cliente: ClienteVenta | null): cliente is ClienteVenta {
  if (cliente === null) return false
  return (
    cliente.nombre.trim() !== '' &&
    DNI_CUIL_REGEX.test(cliente.dni_cuil.trim()) &&
    cliente.email.trim() !== '' &&
    cliente.telefono.trim() !== ''
  )
}
