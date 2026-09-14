import { useState } from 'react'
import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO } from '../config/ordenCompra.config'

const LIMITE_BUSQUEDA = 10

interface FiltrosOrdenesCompraBarProps {
  FK_proveedor: string
  onFKProveedorChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  hayFiltros: boolean
  /** Acciones de la pantalla (el botón de alta), alineadas a la derecha. */
  acciones?: ReactNode
}

/**
 * Barra de filtros del listado de órdenes de compra: proveedor, estado y
 * período de emisión. Los tres combinables y opcionales.
 *
 * El proveedor es un `<Combobox>` con búsqueda server-side (catálogo grande);
 * incluye los dados de baja, porque puede haber órdenes de un proveedor que
 * después se dio de baja.
 */
export function FiltrosOrdenesCompraBar({
  FK_proveedor,
  onFKProveedorChange,
  estado,
  onEstadoChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
  acciones,
}: FiltrosOrdenesCompraBarProps) {
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const { data: proveedores, isFetching: buscandoProveedores } = useProveedores({
    busqueda: busquedaProveedor.trim() || undefined,
    estado: 'todos',
    limit: LIMITE_BUSQUEDA,
  })

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
    description: proveedor.estado ? undefined : 'Dado de baja',
  }))
  const hayMasProveedores = (proveedores?.meta.total ?? 0) > opcionesProveedor.length

  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Combobox
          size="sm"
          label="Proveedor"
          placeholder="Todos los proveedores"
          minChars={0}
          value={FK_proveedor}
          onChange={onFKProveedorChange}
          options={opcionesProveedor}
          onSearch={setBusquedaProveedor}
          loading={buscandoProveedores}
          hasMoreResults={hayMasProveedores}
          emptyText="No se encontraron proveedores"
          className="w-60"
        />

        <Select
          size="sm"
          label="Estado"
          options={OPCIONES_ESTADO}
          value={estado}
          onChange={(evento) => onEstadoChange(evento.target.value)}
          className="w-48"
        />

        <Input
          size="sm"
          type="date"
          label="Emitida desde"
          value={fechaDesde}
          onChange={(evento) => onFechaDesdeChange(evento.target.value)}
          className="w-44"
        />
        <Input
          size="sm"
          type="date"
          label="Emitida hasta"
          value={fechaHasta}
          onChange={(evento) => onFechaHastaChange(evento.target.value)}
          error={errorRango}
          className="w-44"
        />

        <Button
          size="sm"
          icon={<FilterX />}
          onClick={onLimpiar}
          disabled={!hayFiltros}
          title="Quitar todos los filtros aplicados"
        >
          Limpiar filtros
        </Button>
      </div>

      {acciones}
    </div>
  )
}
