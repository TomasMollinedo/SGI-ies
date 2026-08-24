import { z } from 'zod'

/** Límites calcados del DTO Zod del backend (create-categoria.dto.ts). */
export const categoriaFormSchema = z.object({
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
})

export type CategoriaFormValues = z.input<typeof categoriaFormSchema>
export type CategoriaFormOutput = z.output<typeof categoriaFormSchema>
