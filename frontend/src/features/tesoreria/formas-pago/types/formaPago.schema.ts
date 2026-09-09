import { z } from 'zod'

/** Límites calcados de los DTO Zod del backend (create/update-forma-pago.dto.ts). */
export const formaPagoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
  /**
   * El indicador va por `<Select>`, así que el formulario trabaja con
   * `'true'`/`'false'` y acá se traduce al booleano que espera el backend. El
   * `min(1)` es el que atrapa la opción vacía del placeholder: sin elegir, el
   * campo no valida y el submit no se dispara.
   */
  requiere_referencia: z
    .string()
    .min(1, 'Indicá si requiere número de referencia')
    .pipe(z.enum(['true', 'false']))
    .transform((valor) => valor === 'true'),
})

export type FormaPagoFormValues = z.input<typeof formaPagoFormSchema>
export type FormaPagoFormOutput = z.output<typeof formaPagoFormSchema>
