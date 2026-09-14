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
 */
export function ResumenPeriodoPago({ resumen }: ResumenPeriodoPagoProps) {
  return (
    <div className="bg-fondotabla border-subtle rounded-md border p-4 shadow-md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-content font-semibold">Egresos del período</h2>
        <span className="text-content text-lg font-semibold">
          {formatearImporte(resumen.totalEgresos)}
        </span>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-content-muted text-xs font-medium uppercase">Por proveedor</p>
          <ul className="mt-1 space-y-1 text-sm">
            {resumen.subtotalesPorProveedor.map((item) => (
              <li key={item.proveedor.id_proveedor} className="flex justify-between gap-2">
                <span className="text-content">{item.proveedor.razon_social}</span>
                <span className="text-content-muted whitespace-nowrap">
                  {formatearImporte(item.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-content-muted text-xs font-medium uppercase">Por forma de pago</p>
          <ul className="mt-1 space-y-1 text-sm">
            {resumen.subtotalesPorFormaPago.map((item) => (
              <li key={item.formaPago.id_forma_pago} className="flex justify-between gap-2">
                <span className="text-content">{item.formaPago.nombre}</span>
                <span className="text-content-muted whitespace-nowrap">
                  {formatearImporte(item.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
