import { useEffect, useState } from 'react'
import { UserCheck, X } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ClienteCombobox } from './ClienteCombobox'
import type { ClienteResumen } from '../types/venta.types'

interface FiltroClienteVentaProps {
  /** `id_cliente` resuelto, o `''` si no hay filtro. */
  value: string
  onChange: (valor: string) => void
}

/**
 * Filtro de cliente del listado de ventas: mismo `ClienteCombobox` con
 * búsqueda server-side por nombre/apellido/DNI/email que usa el alta de
 * venta (antes buscaba solo por DNI/CUIL o correo exacto, vía
 * `GET /ventas/buscar-cliente`).
 */
export function FiltroClienteVenta({ value, onChange }: FiltroClienteVentaProps) {
  const [clienteResuelto, setClienteResuelto] = useState<ClienteResumen | null>(null)

  // Si el filtro se limpia desde afuera (botón "Limpiar filtros"), este combo
  // también tiene que olvidarse del cliente resuelto.
  useEffect(() => {
    if (value === '') setClienteResuelto(null)
  }, [value])

  function seleccionar(cliente: ClienteResumen) {
    setClienteResuelto(cliente)
    onChange(String(cliente.id_cliente))
  }

  function limpiar() {
    setClienteResuelto(null)
    onChange('')
  }

  if (clienteResuelto) {
    return (
      <div className="border-subtle bg-fondotabla flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
        <UserCheck className="text-success size-4 shrink-0" aria-hidden="true" />
        <span className="text-content wrap-anywhere">
          {clienteResuelto.nombre} {clienteResuelto.apellido ?? ''}
        </span>
        <IconButton
          icon={<X />}
          ariaLabel="Quitar filtro de cliente"
          size="sm"
          variant="ghost"
          onClick={limpiar}
        />
      </div>
    )
  }

  return (
    <ClienteCombobox
      onSeleccionar={seleccionar}
      label="Cliente"
      size="sm"
      className="w-full sm:w-80"
    />
  )
}
