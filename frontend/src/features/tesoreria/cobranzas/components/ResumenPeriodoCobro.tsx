import { StatTile } from '@/shared/components/common/StatTile'
import { formatearImporte } from '@/shared/utils/importe'
import type { ResumenPeriodoCobro as ResumenPeriodoCobroData } from '../types/cobro.types'
import { nombreCliente } from '../utils/cliente'

interface ResumenPeriodoCobroProps {
  resumen: ResumenPeriodoCobroData
}

/**
 * Control de ingresos del período: el total cobrado en el rango elegido, con
 * el desglose por cliente y por forma de pago. Solo se muestra cuando el
 * backend lo devuelve (`fechaDesde` y `fechaHasta` puestas juntas); lo calcula
 * sobre todas las páginas y ya excluye los cobros anulados, sin importar qué
 * filtro de estado esté aplicado. Acá no se recalcula nada.
 *
 * Gemela deliberada de `ResumenPeriodoPago` (Pagos, HU-18): se copió para no
 * tocar Pagos ni `shared/`. Si aparece un tercer uso, conviene extraer una
 * versión compartida.
 */
export function ResumenPeriodoCobro({ resumen }: ResumenPeriodoCobroProps) {
  return (
    <section aria-label="Cobrado en el período" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StatTile
        label="Cobrado en el período"
        value={formatearImporte(resumen.totalIngresos)}
        // Los anulados se ven en el listado pero no suman: es lo que más confunde.
        note="No incluye los cobros anulados."
        valueClassName="wrap-anywhere"
        className="flex flex-col justify-center"
      />

      <DesglosePeriodo
        titulo="Por cliente"
        items={resumen.subtotalesPorCliente.map((item) => ({
          key: item.cliente.id_cliente,
          nombre: nombreCliente(item.cliente),
          total: item.total,
        }))}
      />

      <DesglosePeriodo
        titulo="Por forma de pago"
        items={resumen.subtotalesPorFormaPago.map((item) => ({
          key: item.formaPago.id_forma_pago,
          nombre: item.formaPago.nombre,
          total: item.total,
        }))}
      />
    </section>
  )
}

function DesglosePeriodo({
  titulo,
  items,
}: {
  titulo: string
  items: { key: number; nombre: string; total: number }[]
}) {
  return (
    <div className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md">
      <p className="text-content-muted text-xs font-medium uppercase">{titulo}</p>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex justify-between gap-2">
            <span className="text-content min-w-0 wrap-anywhere">{item.nombre}</span>
            <span className="text-content-muted whitespace-nowrap">
              {formatearImporte(item.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
