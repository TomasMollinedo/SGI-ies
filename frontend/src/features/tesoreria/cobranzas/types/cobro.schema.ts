import { z } from 'zod'
import { hoyIso } from '@/shared/utils/fecha'
import { aCentavos, tieneFormatoImporte } from '../utils/importeCentavos'

/**
 * Cabecera del formulario de registro de un cobro. El detalle (cuotas
 * imputadas e importes) no vive acá: es una tabla de selección sobre las
 * cuotas imputables del cliente elegido, manejada aparte en
 * `NuevoCobroPage` — mismo criterio que `pagoFormSchema`.
 *
 * Límites calcados de `createCobroSchema` (create-cobro.dto.ts).
 */
export const cobroFormSchema = z.object({
  FK_cliente: z
    .string()
    .min(1, 'Elegí un cliente')
    .transform((valor) => Number(valor)),
  FK_forma_pago: z
    .string()
    .min(1, 'Elegí una forma de pago')
    .transform((valor) => Number(valor)),
  fecha_cobro: z
    .string()
    .min(1, 'La fecha de cobro es obligatoria')
    .refine((valor) => valor <= hoyIso(), 'La fecha de cobro no puede ser futura'),
  numero_referencia: z
    .string()
    .trim()
    .max(100, 'El número de referencia no puede superar los 100 caracteres')
    .optional()
    .or(z.literal('')),
  // Un solo mensaje por vez (superRefine + return), en el orden en que el
  // usuario lo tiene que corregir.
  importe_total: z
    .string()
    .superRefine((valor, ctx) => {
      if (!valor.trim()) {
        ctx.addIssue({ code: 'custom', message: 'El importe total es obligatorio' })
        return
      }
      if (!tieneFormatoImporte(valor)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Ingresá un importe válido, con hasta dos decimales',
        })
        return
      }
      if (aCentavos(Number(valor)) <= 0) {
        ctx.addIssue({ code: 'custom', message: 'El importe total debe ser mayor a 0' })
      }
    })
    .transform((valor) => Number(valor)),
  observaciones: z
    .string()
    .trim()
    .max(500, 'Las observaciones no pueden superar los 500 caracteres')
    .optional()
    .or(z.literal('')),
})

export type CobroFormValues = z.input<typeof cobroFormSchema>
export type CobroFormOutput = z.output<typeof cobroFormSchema>
