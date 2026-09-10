import { z } from 'zod'

/**
 * Mismo formato de CBU y alias que valida el backend. Las dos aceptan también
 * el string vacío (el `?` del grupo): los datos bancarios son opcionales, y un
 * campo sin completar —o que se borró en la edición— llega como ''.
 */
const CBU_REGEX = /^(\d{22})?$/
const ALIAS_REGEX = /^([A-Za-z0-9.-]{6,20})?$/

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
  banco: z.string().trim().max(100, 'El banco no puede superar los 100 caracteres').optional(),
  titular: z.string().trim().max(150, 'El titular no puede superar los 150 caracteres').optional(),
  cbu: z
    .string()
    .trim()
    .regex(CBU_REGEX, 'El CBU debe tener exactamente 22 dígitos, sin espacios ni guiones')
    .optional(),
  alias: z
    .string()
    .trim()
    .regex(
      ALIAS_REGEX,
      'El alias debe tener entre 6 y 20 caracteres, y solo puede tener letras, números, puntos o guiones'
    )
    .optional(),
  observaciones: z.string().trim().optional().or(z.literal('')),
})

export type ProveedorFormValues = z.input<typeof proveedorFormSchema>
export type ProveedorFormOutput = z.output<typeof proveedorFormSchema>
