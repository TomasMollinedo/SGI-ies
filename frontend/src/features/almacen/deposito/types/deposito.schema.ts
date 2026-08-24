import { z } from 'zod'

/** Límites calcados del DTO Zod del backend (create-deposito.dto.ts). */
export const depositoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  // El <select> nativo solo maneja strings; se transforma a boolean acá para
  // que el resto del form (y el payload que sale de acá) ya trabaje tipado.
  es_obrador: z.enum(['true', 'false']).transform((valor) => valor === 'true'),
  ubicacion: z
    .string()
    .trim()
    .min(1, 'La ubicación es obligatoria')
    .max(255, 'La ubicación no puede superar los 255 caracteres'),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
})

export type DepositoFormValues = z.input<typeof depositoFormSchema>
export type DepositoFormOutput = z.output<typeof depositoFormSchema>
