import { z } from 'zod'

/**
 * Límites calcados del DTO del backend (completar-datos-cliente.dto.ts). En
 * el backend ambos campos son opcionales (el PATCH sirve para actualizar uno
 * solo); esta pantalla puntual siempre pide los dos.
 */
export const completarDatosFormSchema = z.object({
  dni_cuil: z
    .string()
    .trim()
    .min(1, 'El DNI/CUIT es obligatorio')
    .regex(
      /^(\d{7,8}|\d{11})$/,
      'Ingresá un DNI (7 u 8 dígitos) o un CUIT/CUIL (11 dígitos), sin puntos ni guiones'
    ),
  telefono: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio')
    .max(30, 'El teléfono no puede superar los 30 caracteres')
    .regex(/^\d+$/, 'El teléfono solo puede contener números, sin espacios ni guiones'),
})

export type CompletarDatosFormValues = z.input<typeof completarDatosFormSchema>
export type CompletarDatosFormOutput = z.output<typeof completarDatosFormSchema>
