import { z } from 'zod'

/** Límites calcados del DTO Zod del backend (create-unidad-medida.dto.ts). */
export const unidadMedidaFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  abreviatura: z
    .string()
    .trim()
    .min(1, 'La abreviatura es obligatoria')
    .max(10, 'La abreviatura no puede superar los 10 caracteres'),
})

export type UnidadMedidaFormValues = z.input<typeof unidadMedidaFormSchema>
export type UnidadMedidaFormOutput = z.output<typeof unidadMedidaFormSchema>
