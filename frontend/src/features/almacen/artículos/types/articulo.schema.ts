import { z } from 'zod'

/** Límites calcados del DTO Zod del backend (create-articulo.dto.ts). */
export const articuloFormSchema = z.object({
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
  // El <select> nativo solo maneja strings: se valida que haya una opción
  // elegida y se transforma a number recién al salir del form.
  FK_Categoria: z.string().min(1, 'La categoría es obligatoria').transform(Number),
  FK_UnidadMedida: z.string().min(1, 'La unidad de medida es obligatoria').transform(Number),
  // Marca es opcional: '' (la opción "Sin marca") sale como `null`, para poder
  // distinguir "sin marca" de "no tocar la marca" al editar.
  FK_Marca: z.string().transform((valor) => (valor ? Number(valor) : null)),
})

export type ArticuloFormValues = z.input<typeof articuloFormSchema>
export type ArticuloFormOutput = z.output<typeof articuloFormSchema>
