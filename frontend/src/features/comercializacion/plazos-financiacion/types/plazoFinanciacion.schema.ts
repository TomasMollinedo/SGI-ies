import { z } from 'zod'
import { MAX_CANTIDAD_CUOTAS } from '../config/plazoFinanciacion.config'

/**
 * Validación del formulario, calcada de `create-plazo-financiacion.dto.ts` del
 * backend. Se replica para marcar el error al lado del campo en vez de esperar
 * al 400; el backend sigue siendo la autoridad.
 *
 * Los dos campos numéricos viven en el form como string y se convierten a
 * número en el `transform` final: así vacío es `''` y no `NaN`, y la TNA admite
 * la coma como separador decimal.
 */
const FORMATO_ENTERO = /^\d+$/
const FORMATO_TNA = /^\d+([.,]\d{1,2})?$/

/** Tope de la columna `Decimal(5, 2)`. */
const TNA_MAXIMA = 999.99

export const plazoFinanciacionFormSchema = z.object({
  /**
   * Solo se carga en el alta. En edición y lectura el campo está bloqueado y
   * viaja con el valor que ya tenía, que la página no usa para el PATCH.
   */
  cantidad_cuotas: z
    .string()
    .trim()
    .min(1, 'La cantidad de cuotas es obligatoria')
    .refine((valor) => FORMATO_ENTERO.test(valor), {
      error: 'La cantidad de cuotas debe ser un número entero',
      abort: true,
    })
    .refine((valor) => Number(valor) > 0, 'La cantidad de cuotas debe ser mayor a cero')
    .refine(
      (valor) => Number(valor) <= MAX_CANTIDAD_CUOTAS,
      `La cantidad de cuotas no puede superar ${MAX_CANTIDAD_CUOTAS}`
    )
    .transform(Number),
  tasa_nominal_anual: z
    .string()
    .trim()
    .min(1, 'La TNA es obligatoria')
    .refine((valor) => FORMATO_TNA.test(valor), {
      error: 'La TNA debe ser un número positivo con hasta dos decimales',
      abort: true,
    })
    .refine(
      (valor) => Number(valor.replace(',', '.')) <= TNA_MAXIMA,
      'La TNA no puede superar 999,99'
    )
    .transform((valor) => Number(valor.replace(',', '.'))),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
})

export type PlazoFinanciacionFormValues = z.input<typeof plazoFinanciacionFormSchema>
export type PlazoFinanciacionFormOutput = z.output<typeof plazoFinanciacionFormSchema>
