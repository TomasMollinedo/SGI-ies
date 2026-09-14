import { useState } from 'react'
import { FilterX } from 'lucide-react'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_CONDICION_SALDO, OPCIONES_ESTADO } from '../config/cuentaCorriente.config'

/** Resultados que se muestran en el desplegable de búsqueda de proveedor. */
const LIMITE_BUSQUEDA = 10

interface FiltrosCuentasCorrientesBarProps {
  FKProveedor: string
  onFKProveedorChange: (valor: string) => void
  condicionSaldo: string
  onCondicionSaldoChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
  onLimpiar: () => void
  hayFiltros: boolean
}

/**
 * Barra de filtros de cuentas corrientes: proveedor puntual, condición de
 * saldo y estado. Proveedor es un `<Combobox>` con búsqueda server-side —igual
 * que en el resto de los filtros de catálogo del proyecto—, y busca entre
 * activos e inactivos porque acá también aparecen los dados de baja.
 */
export function FiltrosCuentasCorrientesBar({
  FKProveedor,
  onFKProveedorChange,
  condicionSaldo,
  onCondicionSaldoChange,
  estado,
  onEstadoChange,
  onLimpiar,
  hayFiltros,
}: FiltrosCuentasCorrientesBarProps) {
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const { data: proveedores, isFetching: buscandoProveedores } = useProveedores({
    busqueda: busquedaProveedor.trim() || undefined,
    estado: 'todos',
    limit: LIMITE_BUSQUEDA,
  })

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
    description: [proveedor.cuit, ...(proveedor.estado ? [] : ['Dado de baja'])].join(' · '),
  }))

  const hayMasProveedores = (proveedores?.meta.total ?? 0) > opcionesProveedor.length

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Combobox
        size="sm"
        label="Proveedor"
        placeholder="Todos los proveedores"
        minChars={1}
        value={FKProveedor}
        onChange={onFKProveedorChange}
        options={opcionesProveedor}
        onSearch={setBusquedaProveedor}
        loading={buscandoProveedores}
        hasMoreResults={hayMasProveedores}
        emptyText="No se encontraron proveedores"
        className="w-64"
      />

      <Select
        size="sm"
        label="Condición de saldo"
        options={OPCIONES_CONDICION_SALDO}
        value={condicionSaldo}
        onChange={(evento) => onCondicionSaldoChange(evento.target.value)}
        className="w-52"
      />

      <Select
        size="sm"
        label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value)}
        className="w-52"
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
  )
}
