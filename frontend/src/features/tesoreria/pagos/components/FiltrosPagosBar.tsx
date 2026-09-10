import { Search, FilterX } from 'lucide-react'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstadoPago } from '../types/pago.types'

/** Formas de pago que puede haber usado algún pago histórico, activas o no. */
const LIMITE_FORMAS_PAGO = 100

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'CONFIRMADA', label: 'Confirmados' },
  { value: 'ANULADA', label: 'Anulados' },
]

interface FiltrosPagosBarProps {
  busquedaProveedor: string
  onBusquedaProveedorChange: (valor: string) => void
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
 * Proveedor busca por razón social en texto libre (el backend filtra por
 * coincidencia parcial, palabra por palabra) — se tipea y el listado se
 * actualiza solo (debounced en la página), sin elegir nada de un desplegable.
 * Forma de pago, en cambio, es un catálogo chico y fijo, así que va como
 * `<Select>`, pedido con `estado: 'todos'`: un pago histórico puede tener una
 * forma de pago ya dada de baja, y hay que poder filtrarlo igual.
 */
export function FiltrosPagosBar({
  busquedaProveedor,
  onBusquedaProveedorChange,
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
  const { data: formasPago } = useFormasPago({
    estado: 'todos',
    limit: LIMITE_FORMAS_PAGO,
  })

  const opcionesFormaPago: SelectOption[] = [
    { value: '', label: 'Todas las formas de pago' },
    ...(formasPago?.data.map((formaPago) => ({
      value: String(formaPago.id_forma_pago),
      label: formaPago.nombre,
    })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        size="sm"
        type="search"
        label="Proveedor"
        placeholder="Buscar por proveedor"
        iconLeft={<Search />}
        value={busquedaProveedor}
        onChange={(evento) => onBusquedaProveedorChange(evento.target.value)}
        className="w-56"
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
