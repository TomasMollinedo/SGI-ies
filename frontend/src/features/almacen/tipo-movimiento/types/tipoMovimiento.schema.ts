import { z } from 'zod'

/** Límites calcados de los DTO Zod del backend (create/update-tipo-movimiento.dto.ts). */
export const tipoMovimientoFormSchema = z.object({
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
   * El `<Select>` maneja strings, así que el formulario trabaja con
   * `'true'`/`'false'` y acá se traduce al booleano que espera el backend. El
   * `min(1)` es el que atrapa la opción vacía del placeholder: sin elegir, el
   * campo no valida y el submit no se dispara.
   */
  indicador_entrada: z
    .string()
    .min(1, 'Indicá si el movimiento suma o resta stock')
    .pipe(z.enum(['true', 'false']))
    .transform((valor) => valor === 'true'),
})

export type TipoMovimientoFormValues = z.input<typeof tipoMovimientoFormSchema>
export type TipoMovimientoFormOutput = z.output<typeof tipoMovimientoFormSchema>
