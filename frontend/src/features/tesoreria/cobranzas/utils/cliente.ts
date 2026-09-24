/** Nombre y apellido de un cliente (el apellido es opcional en el backend). */
export function nombreCliente(cliente: { nombre: string; apellido: string | null }): string {
  return [cliente.nombre, cliente.apellido].filter(Boolean).join(' ')
}
