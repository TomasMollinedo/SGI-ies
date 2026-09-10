import { z } from 'zod'
import { hoyIso } from '../utils/fechaPago'

/**
 * Cabecera del formulario de emisión de un pago. El detalle (comprobantes
 * imputados e importes) no vive acá: es una tabla de selección sobre los
 * comprobantes imputables del proveedor elegido, manejada aparte en
 * `PagoForm` — no tiene sentido como campos sueltos de este schema.
 *
 * Límites calcados de `createPagoSchema` (create-pago.dto.ts).
 */
export const pagoFormSchema = z.object({
  FK_proveedor: z
    .string()
    .min(1, 'Elegí un proveedor')
    .transform((valor) => Number(valor)),
  FK_forma_pago: z
    .string()
    .min(1, 'Elegí una forma de pago')
    .transform((valor) => Number(valor)),
  fecha_pago: z
    .string()
    .min(1, 'La fecha de pago es obligatoria')
    .refine((valor) => valor <= hoyIso(), 'La fecha de pago no puede ser futura'),
  numero_referencia: z
    .string()
    .trim()
    .max(100, 'El número de referencia no puede superar los 100 caracteres')
    .optional()
    .or(z.literal('')),
  observaciones: z
    .string()
    .trim()
    .max(500, 'Las observaciones no pueden superar los 500 caracteres')
    .optional()
    .or(z.literal('')),
})

export type PagoFormValues = z.input<typeof pagoFormSchema>
export type PagoFormOutput = z.output<typeof pagoFormSchema>
