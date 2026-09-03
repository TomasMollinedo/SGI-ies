import { z } from 'zod'

/** Límites calcados de los DTO Zod del backend (create/update-tipo-comprobante.dto.ts). */
export const tipoComprobanteFormSchema = z.object({
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
   * Los dos indicadores estructurales van por `<Select>`, así que el
   * formulario trabaja con `'true'`/`'false'` y acá se traducen al booleano
   * que espera el backend. El `min(1)` es el que atrapa la opción vacía del
   * placeholder: sin elegir, el campo no valida y el submit no se dispara.
   */
  aumenta_saldo: z
    .string()
    .min(1, 'Indicá el efecto sobre el saldo')
    .pipe(z.enum(['true', 'false']))
    .transform((valor) => valor === 'true'),
  requiere_comprobante_origen: z
    .string()
    .min(1, 'Indicá si requiere comprobante de origen')
    .pipe(z.enum(['true', 'false']))
    .transform((valor) => valor === 'true'),
})

export type TipoComprobanteFormValues = z.input<typeof tipoComprobanteFormSchema>
export type TipoComprobanteFormOutput = z.output<typeof tipoComprobanteFormSchema>
