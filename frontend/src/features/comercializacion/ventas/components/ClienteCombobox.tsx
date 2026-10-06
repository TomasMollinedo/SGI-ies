import { useState } from 'react'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import type { FieldSize } from '@/shared/components/ui/fieldStyles'
import { useBuscarClientes } from '../hooks/useVentas'
import type { ClienteResumen } from '../types/venta.types'

interface ClienteComboboxProps {
  /** Se llama con el cliente completo (no solo el id) apenas se elige una opción. */
  onSeleccionar: (cliente: ClienteResumen) => void
  disabled?: boolean
  label?: string
  size?: FieldSize
  className?: string
}

/**
 * Buscador de cliente con búsqueda server-side por nombre, apellido,
 * DNI/CUIL o email — mismo patrón que `ProyectoCombobox`. Lo usan el alta de
 * venta (`BuscadorCliente`) y el filtro de cliente del listado
 * (`FiltroClienteVenta`). A diferencia de un combo común, quien lo usa
 * necesita el registro completo (para precargar `ClienteVenta` o resolver el
 * `id_cliente` del filtro), no solo el id: por eso expone
 * `onSeleccionar(cliente)` en vez del `value`/`onChange` de string de
 * `Combobox`, resolviendo el id elegido contra la última página buscada.
 */
export function ClienteCombobox({
  onSeleccionar,
  disabled,
  label = 'Buscar cliente',
  size = 'md',
  className = 'min-w-0 flex-1',
}: ClienteComboboxProps) {
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState('')

  const { data, isFetching } = useBuscarClientes(busqueda)
  const clientes = data?.data ?? []

  const opciones: ComboboxOption[] = clientes.map((cliente) => ({
    value: String(cliente.id_cliente),
    label: `${cliente.nombre} ${cliente.apellido ?? ''}`.trim(),
    description: [cliente.dni_cuil ?? 'Sin DNI/CUIL', cliente.email].join(' · '),
  }))
  const hayMasResultados = (data?.meta.total ?? 0) > opciones.length

  function manejarSeleccion(id: string) {
    const cliente = clientes.find((candidato) => String(candidato.id_cliente) === id)
    if (!cliente) return
    setSeleccionado(id)
    onSeleccionar(cliente)
  }

  return (
    <Combobox
      label={label}
      size={size}
      placeholder="Nombre, apellido, DNI/CUIL o correo"
      value={seleccionado}
      onChange={manejarSeleccion}
      options={opciones}
      onSearch={setBusqueda}
      loading={isFetching}
      hasMoreResults={hayMasResultados}
      emptyText="No se encontró ningún cliente con esos datos"
      disabled={disabled}
      className={className}
    />
  )
}
