import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { FiltroClienteVenta } from '@/features/comercializacion/ventas/components/FiltroClienteVenta'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstadoCobro } from '../types/cobro.types'

/** Formas de pago que puede haber usado algún cobro histórico, activas o no. */
const LIMITE_FORMAS_PAGO = 100

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'ANULADO', label: 'Anulados' },
]

interface FiltrosCobrosBarProps {
  FK_cliente: string
  onFKClienteChange: (valor: string) => void
  FK_forma_pago: string
  onFKFormaPagoChange: (valor: string) => void
  estado: FiltroEstadoCobro
  onEstadoChange: (valor: FiltroEstadoCobro) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  hayFiltros: boolean
  /** Acciones de la pantalla (el botón de alta), alineadas a la derecha de la barra. */
  acciones?: ReactNode
}

/**
 * Barra de filtros del listado de cobros: cliente, forma de pago, estado y
 * rango de fechas (sobre `fecha_cobro`). Todos son opcionales y se combinan
 * entre sí. Molde: `FiltrosPagosBar`.
 *
 * Cliente reutiliza `FiltroClienteVenta` (búsqueda server-side de clientes).
 * Forma de pago se pide con `estado: 'todos'`: un cobro histórico puede
 * tener una forma de pago ya dada de baja, y hay que poder filtrarlo igual.
 *
 * Todos los controles van `w-full` en mobile para que la barra se apile sin
 * scroll horizontal a 400 px.
 */
export function FiltrosCobrosBar({
  FK_cliente,
  onFKClienteChange,
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
  acciones,
}: FiltrosCobrosBarProps) {
  const { data: formasPago } = useFormasPago({
    estado: 'todos',
    limit: LIMITE_FORMAS_PAGO,
  })

  const opcionesFormaPago: SelectOption[] = [
    { value: '', label: 'Todas las formas de pago' },
    ...(formasPago?.data.map((formaPago) => ({
      value: String(formaPago.id_forma_pago),
      label: formaPago.estado ? formaPago.nombre : `${formaPago.nombre} · Inactiva`,
      colorClassName: formaPago.estado ? 'text-success' : 'text-error',
    })) ?? []),
  ]

  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-3">
      <div className="flex w-full min-w-0 flex-wrap items-end gap-3 sm:w-auto">
        <div className="w-full sm:w-auto">
          <FiltroClienteVenta value={FK_cliente} onChange={onFKClienteChange} />
        </div>

        <Select
          size="sm"
          label="Forma de pago"
          options={opcionesFormaPago}
          value={FK_forma_pago}
          onChange={(evento) => onFKFormaPagoChange(evento.target.value)}
          className="w-full sm:w-60"
        />

        <Select
          size="sm"
          label="Estado"
          options={OPCIONES_ESTADO}
          value={estado}
          onChange={(evento) => {
            const valor = evento.target.value
            if (esFiltroEstadoCobro(valor)) onEstadoChange(valor)
          }}
          className="w-full sm:w-44"
        />

        {/* El `<input type="date">` nativo ya trae el calendario del navegador y
          devuelve el valor en ISO (YYYY-MM-DD). */}
        <Input
          size="sm"
          type="date"
          label="Fecha desde"
          value={fechaDesde}
          onChange={(evento) => onFechaDesdeChange(evento.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          size="sm"
          type="date"
          label="Fecha hasta"
          value={fechaHasta}
          onChange={(evento) => onFechaHastaChange(evento.target.value)}
          error={errorRango}
          className="w-full sm:w-40"
        />

        <Button
          size="sm"
          icon={<FilterX />}
          onClick={onLimpiar}
          disabled={!hayFiltros}
          title="Quitar todos los filtros aplicados"
          className="w-full sm:w-auto"
        >
          Limpiar filtros
        </Button>
      </div>

      {acciones}
    </div>
  )
}

function esFiltroEstadoCobro(valor: string): valor is FiltroEstadoCobro {
  return valor === '' || valor === 'CONFIRMADO' || valor === 'ANULADO'
}
