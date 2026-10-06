import { z } from 'zod'

/**
 * Límites calcados del DTO del backend (completar-datos-cliente.dto.ts). En
 * el backend los cuatro campos son opcionales (el PATCH sirve para actualizar
 * cualquier subconjunto); esta pantalla puntual siempre pide los cuatro.
 */
export const completarDatosFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  apellido: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio')
    .max(100, 'El apellido no puede superar los 100 caracteres'),
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
