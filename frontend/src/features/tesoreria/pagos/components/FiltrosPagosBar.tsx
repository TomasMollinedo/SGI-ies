import { useState } from 'react'
import { FilterX } from 'lucide-react'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstadoPago } from '../types/pago.types'

/** Resultados que se muestran en el desplegable de búsqueda de proveedor. */
const LIMITE_BUSQUEDA_PROVEEDOR = 10

/** Formas de pago que puede haber usado algún pago histórico, activas o no. */
const LIMITE_FORMAS_PAGO = 100

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'CONFIRMADA', label: 'Confirmados' },
  { value: 'ANULADA', label: 'Anulados' },
]

interface FiltrosPagosBarProps {
  FK_proveedor: string
  onFKProveedorChange: (valor: string) => void
  FK_forma_pago: string
  onFKFormaPagoChange: (valor: string) => void
  estado: FiltroEstadoPago
  onEstadoChange: (valor: FiltroEstadoPago) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  hayFiltros: boolean
}

/**
 * Barra de filtros del listado de pagos: proveedor, forma de pago, estado y
 * rango de fechas (sobre `fecha_pago`). Todos son opcionales y se combinan
 * entre sí.
 *
 * Proveedor es un `<Combobox>`: se busca escribiendo y se elige una
 * coincidencia del desplegable (mismo patrón que el depósito en el historial
 * de movimientos). Forma de pago, en cambio, es un catálogo chico y fijo, así
 * que alcanza con un `<Select>`. Los dos se piden con `estado: 'todos'`: un
 * pago histórico puede tener un proveedor o una forma de pago ya dados de
 * baja, y hay que poder filtrarlo igual.
 */
export function FiltrosPagosBar({
  FK_proveedor,
  onFKProveedorChange,
  FK_forma_pago,
  onFKFormaPagoChange,
  estado,
  onEstadoChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
}: FiltrosPagosBarProps) {
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const { data: proveedores, isFetching: buscandoProveedores } = useProveedores({
    busqueda: busquedaProveedor.trim() || undefined,
    estado: 'todos',
    limit: LIMITE_BUSQUEDA_PROVEEDOR,
  })

  const { data: formasPago } = useFormasPago({
    estado: 'todos',
    limit: LIMITE_FORMAS_PAGO,
  })

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
    description: [proveedor.cuit, ...(proveedor.estado ? [] : ['Dado de baja'])].join(' · '),
  }))

  const opcionesFormaPago: SelectOption[] = [
    { value: '', label: 'Todas las formas de pago' },
    ...(formasPago?.data.map((formaPago) => ({
      value: String(formaPago.id_forma_pago),
      label: formaPago.nombre,
    })) ?? []),
  ]

  const hayMasProveedores = (proveedores?.meta.total ?? 0) > opcionesProveedor.length

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Combobox
        size="sm"
        label="Proveedor"
        placeholder="Todos los proveedores"
        minChars={1}
        value={FK_proveedor}
        onChange={onFKProveedorChange}
        options={opcionesProveedor}
        onSearch={setBusquedaProveedor}
        loading={buscandoProveedores}
        hasMoreResults={hayMasProveedores}
        emptyText="No se encontraron proveedores"
        className="w-70"
      />

      <Select
        size="sm"
        label="Forma de pago"
        options={opcionesFormaPago}
        value={FK_forma_pago}
        onChange={(evento) => onFKFormaPagoChange(evento.target.value)}
        className="w-60"
      />

      <Select
        size="sm"
        label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstadoPago)}
        className="w-50"
      />

      {/* El `<input type="date">` nativo ya trae el calendario del navegador y
          devuelve el valor en ISO (YYYY-MM-DD). */}
      <Input
        size="sm"
        type="date"
        label="Fecha desde"
        value={fechaDesde}
        onChange={(evento) => onFechaDesdeChange(evento.target.value)}
        className="w-40"
      />
      <Input
        size="sm"
        type="date"
        label="Fecha hasta"
        value={fechaHasta}
        onChange={(evento) => onFechaHastaChange(evento.target.value)}
        error={errorRango}
        className="w-40"
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
