import { Button } from '@/shared/components/ui/Button'
import { formatearImporte } from '@/shared/utils/importe'
import { formatearPorcentaje } from '../utils/decimal'

interface AyudaDePrecioProps {
  /** `costo + costo * porcentaje / 100 + margen`. `null` si no hay nada que sugerir. */
  precioSugerido: number | null
  /** `(precio - costo) / costo * 100`, solo mientras se escribe el precio a mano. */
  gananciaImplicita: number | null
  /** Copia la sugerencia al campo precio. */
  onUsarPrecioSugerido: () => void
  disabled?: boolean
}

/**
 * El panel de ayuda que acompaña al campo de precio. Muestra dos cosas, según
 * por dónde esté entrando el usuario:
 *
 * - Cargó porcentaje y/o margen → el precio sugerido por la fórmula, con un
 *   botón para copiarlo. Nunca se escribe solo en el campo: el precio es
 *   decisión de Comercialización, no de la fórmula.
 * - Está escribiendo el precio a mano, sin porcentaje ni margen → el
 *   porcentaje de ganancia que queda implícito, de solo lectura.
 *
 * Las dos cuentas se hacen en el cliente con el costo que ya está en pantalla
 * (no hay una llamada al backend por tecla) y son informativas: el valor
 * definitivo lo calcula el backend al guardar y puede diferir en milésimas por
 * redondeo.
 */
export function AyudaDePrecio({
  precioSugerido,
  gananciaImplicita,
  onUsarPrecioSugerido,
  disabled = false,
}: AyudaDePrecioProps) {
  if (precioSugerido === null && gananciaImplicita === null) return null

  return (
    <div
      aria-live="polite"
      className="border-subtle bg-surface-muted flex flex-col gap-2 rounded-md border p-3"
    >
      {precioSugerido !== null && (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-content-muted text-xs font-medium uppercase">Precio sugerido</p>
            <p className="text-content text-base font-semibold wrap-anywhere">
              {formatearImporte(precioSugerido)}
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={onUsarPrecioSugerido}
            disabled={disabled}
            className="self-start"
          >
            Usar este precio
          </Button>
        </div>
      )}

      {gananciaImplicita !== null && (
        <div>
          <p className="text-content-muted text-xs font-medium uppercase">
            Ganancia sobre el costo
          </p>
          <p className="text-content text-base font-semibold">
            {formatearPorcentaje(gananciaImplicita)}
          </p>
        </div>
      )}
    </div>
  )
}
