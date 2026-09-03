import { z } from 'zod'

/** Razón social, CUIT y condición IVA son obligatorios; el resto, opcional. */
export const proveedorFormSchema = z.object({
  razon_social: z.string().trim().min(1, 'La razón social es obligatoria'),
  cuit: z.string().trim().min(1, 'El CUIT es obligatorio'),
  // El <select> nativo solo maneja strings: se valida que haya una opción
  // elegida, con el `id` del catálogo de condiciones frente al IVA.
  condicion_iva: z.string().min(1, 'La condición frente al IVA es obligatoria'),
  domicilio: z.string().trim().optional().or(z.literal('')),
  telefono: z.string().trim().optional().or(z.literal('')),
  correo: z.email('El correo no es válido').optional().or(z.literal('')),
  observaciones: z.string().trim().optional().or(z.literal('')),
})

export type ProveedorFormValues = z.input<typeof proveedorFormSchema>
export type ProveedorFormOutput = z.output<typeof proveedorFormSchema>
