import { StatTile } from '@/shared/components/common/StatTile'
import { formatearImporte } from '@/shared/utils/importe'
import type { ResumenPeriodo } from '../types/pago.types'

interface ResumenPeriodoPagoProps {
  resumen: ResumenPeriodo
}

/**
 * Control de egresos del período: el total pagado en el rango elegido, con
 * el desglose por proveedor y por forma de pago. Solo se muestra cuando el
 * backend lo devuelve (`fechaDesde` y `fechaHasta` puestas juntas) — ya
 * excluye los pagos anulados, sin importar qué filtro de estado esté aplicado.
 *
 * Tres tarjetas separadas (mismo lenguaje visual que `ResumenCuentasCorrientes`,
 * con `StatTile` para el total) en vez de un único bloque: así queda claro
 * dónde empieza y termina cada dato, y cada lista de desglose tiene su propio
 * scroll interno (`max-h-40`) — con muchos proveedores o formas de pago no
 * empuja el resto de la pantalla hacia abajo sin límite.
 */
export function ResumenPeriodoPago({ resumen }: ResumenPeriodoPagoProps) {
  return (
    <section aria-label="Egresos del período" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StatTile
        label="Egresos del período"
        value={formatearImporte(resumen.totalEgresos)}
        className="flex flex-col justify-center"
      />

      <DesglosePeriodo
        titulo="Por proveedor"
        items={resumen.subtotalesPorProveedor.map((item) => ({
          key: item.proveedor.id_proveedor,
          nombre: item.proveedor.razon_social,
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
            <span className="text-content">{item.nombre}</span>
            <span className="text-content-muted whitespace-nowrap">
              {formatearImporte(item.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
