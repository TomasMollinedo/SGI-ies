import { z } from 'zod'

/** Límites calcados del DTO Zod del backend (create-marca.dto.ts). */
export const marcaFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    // Los dos `min` encadenados dan mensajes distintos: vacío avisa que el
    // campo es obligatorio, y una sola letra que falta largo.
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
})

export type MarcaFormValues = z.input<typeof marcaFormSchema>
export type MarcaFormOutput = z.output<typeof marcaFormSchema>
