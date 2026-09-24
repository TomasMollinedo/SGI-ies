import { useState } from 'react'
import { FilterX, UserRound, X } from 'lucide-react'
import type { ClienteResumen } from '@/features/comercializacion/ventas/types/venta.types'
import { SelectorClienteModal } from '@/features/tesoreria/cobranzas/components/SelectorClienteModal'
import { nombreCliente } from '@/features/tesoreria/cobranzas/utils/cliente'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO } from '../config/declaracionPago.config'
import type { FiltroEstadoDeclaracion } from '../types/declaracionPago.types'

/** Formas de pago que puede haber usado alguna declaración histórica, activas o no. */
const LIMITE_FORMAS_PAGO = 100

interface FiltrosDeclaracionesPagoBarProps {
  cliente: ClienteResumen | null
  onClienteChange: (cliente: ClienteResumen | null) => void
  FK_forma_pago: string
  onFKFormaPagoChange: (valor: string) => void
  estado: FiltroEstadoDeclaracion
  onEstadoChange: (valor: FiltroEstadoDeclaracion) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  /** Si algún filtro está distinto de su valor por defecto (estado Pendiente, el resto vacío). */
  hayFiltros: boolean
}

/**
 * Barra de filtros de la bandeja de declaraciones: cliente, estado, forma de
 * pago y período (sobre `hora_creacion`). Todos se combinan entre sí.
 *
 * Cliente se elige con el mismo `SelectorClienteModal` de Cobranzas (búsqueda
 * paginada por nombre, DNI/CUIL o correo). Forma de pago se pide con
 * `estado: 'todos'`, igual que en Pagos: una declaración vieja puede tener
 * una forma de pago ya dada de baja, y hay que poder filtrarla igual.
 */
export function FiltrosDeclaracionesPagoBar({
  cliente,
  onClienteChange,
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
}: FiltrosDeclaracionesPagoBarProps) {
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  const { data: formasPago } = useFormasPago({ estado: 'todos', limit: LIMITE_FORMAS_PAGO })

  const opcionesFormaPago: SelectOption[] = [
    { value: '', label: 'Todas las formas de pago' },
    ...(formasPago?.data.map((formaPago) => ({
      value: String(formaPago.id_forma_pago),
      label: formaPago.estado ? formaPago.nombre : `${formaPago.nombre} · Inactiva`,
      colorClassName: formaPago.estado ? 'text-success' : 'text-error',
    })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        {/* Mismo estilo de etiqueta y de caja que `Field`/`Input` sm, para
          alinear con el resto de la barra. */}
        <span className="text-content text-xs font-medium">Cliente</span>
        {cliente ? (
          <div className="border-subtle bg-field flex h-9 max-w-70 items-center gap-2 rounded-md border pr-1 pl-3">
            <button
              type="button"
              onClick={() => setSelectorAbierto(true)}
              title="Cambiar cliente"
              className="text-content focus-visible:outline-primary min-w-0 truncate rounded text-left text-xs focus-visible:outline-2"
            >
              {nombreCliente(cliente)}
            </button>
            <IconButton
              icon={<X />}
              ariaLabel="Quitar filtro de cliente"
              size="sm"
              onClick={() => onClienteChange(null)}
            />
          </div>
        ) : (
          <Button size="sm" icon={<UserRound />} onClick={() => setSelectorAbierto(true)}>
            Elegir cliente
          </Button>
        )}
      </div>

      <Select
        size="sm"
        label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstadoDeclaracion)}
        className="w-50"
      />

      <Select
        size="sm"
        label="Forma de pago"
        options={opcionesFormaPago}
        value={FK_forma_pago}
        onChange={(evento) => onFKFormaPagoChange(evento.target.value)}
        className="w-60"
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
        title="Volver a los filtros por defecto (solo pendientes)"
      >
        Limpiar filtros
      </Button>

      <SelectorClienteModal
        open={selectorAbierto}
        onClose={() => setSelectorAbierto(false)}
        onSeleccionar={(elegido) => {
          onClienteChange(elegido)
          setSelectorAbierto(false)
        }}
      />
    </div>
  )
}
