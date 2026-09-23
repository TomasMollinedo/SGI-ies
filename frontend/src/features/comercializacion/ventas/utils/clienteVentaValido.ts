import type { ClienteVenta } from '../types/venta.types'

/** Los 4 campos que `create-venta.dto.ts` exige siempre, sea el cliente nuevo o ya existente. */
export function clienteVentaValido(cliente: ClienteVenta | null): cliente is ClienteVenta {
  if (cliente === null) return false
  return (
    cliente.nombre.trim() !== '' &&
    cliente.dni_cuil.trim() !== '' &&
    cliente.email.trim() !== '' &&
    cliente.telefono.trim() !== ''
  )
}
