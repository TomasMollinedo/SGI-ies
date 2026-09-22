import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { formatearImporte } from '@/shared/utils/importe'
import type { ResultadoSobreCosto } from '../utils/calculoPrecio'
import { formatearPorcentaje } from '../utils/decimal'

interface AyudaDePrecioProps {
  /** `costo + costo * porcentaje / 100 + margen`. `null` si no hay nada que sugerir. */
  precioSugerido: number | null
  /** Lo que el precio cargado (el que sea) representa sobre el costo, en vivo. */
  resultadoSobreCosto: ResultadoSobreCosto | null
  /** Copia la sugerencia al campo precio. */
  onUsarPrecioSugerido: () => void
  disabled?: boolean
}

/**
 * El panel de ayuda que acompaña al campo de precio, con dos datos (el costo
 * de la unidad se muestra aparte, al lado del propio campo Precio, para
 * compararlos de un vistazo — ver `PlanPagoForm`):
 *
 * - Si cargó porcentaje y/o margen: el precio sugerido por la fórmula, con un
 *   botón para copiarlo. Nunca se escribe solo en el campo: el precio es
 *   decisión de Comercialización, no de la fórmula.
 * - El resultado que el precio actual representa sobre el costo (% y margen
 *   en pesos), siempre que haya costo y precio — se haya llegado a ese precio
 *   con las herramientas o escribiéndolo directo. Es distinto del
 *   `porcentaje_ganancia_implicito` que persiste el backend (ese es solo
 *   referencia cuando no se usó ninguna herramienta): este es un chequeo en
 *   vivo del efecto real de cualquier ajuste manual, incluso si se pisó el
 *   precio sugerido con otro número.
 *
 * Las cuentas se hacen en el cliente con el costo que ya está en pantalla (no
 * hay una llamada al backend por tecla) y son informativas: el valor
 * definitivo lo calcula el backend al guardar y puede diferir en milésimas por
 * redondeo.
 */
export function AyudaDePrecio({
  precioSugerido,
  resultadoSobreCosto,
  onUsarPrecioSugerido,
  disabled = false,
}: AyudaDePrecioProps) {
  if (precioSugerido === null && resultadoSobreCosto === null) return null

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {precioSugerido !== null && (
        <div className="border-subtle bg-surface-muted flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3">
          <div>
            <p className="text-content-muted text-xs font-medium uppercase">Precio sugerido</p>
            <p className="text-content text-base font-semibold wrap-anywhere">
              {formatearImporte(precioSugerido)}
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={onUsarPrecioSugerido} disabled={disabled}>
            Usar este precio
          </Button>
        </div>
      )}

      {resultadoSobreCosto !== null && (
        <div className="border-subtle bg-surface-muted flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <p className="text-content text-xs font-medium uppercase">Rentabilidad total del precio</p>
          <Badge variant={resultadoSobreCosto.margen >= 0 ? 'active' : 'error'} dot={false}>
            Porcentaje: {formatearPorcentaje(resultadoSobreCosto.porcentaje)}
          </Badge>
        </div>
      )}
    </div>
  )
}
