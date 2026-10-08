import { z } from 'zod'

/**
 * Mismo formato de DNI/CUIL que valida el backend: 7 u 8 dígitos (DNI) u 11
 * (CUIT/CUIL), sin puntos ni guiones. El `?` del grupo acepta además el string
 * vacío, porque el campo es opcional y un cliente de Google puede no tenerlo
 * cargado todavía.
 */
const DNI_CUIL_REGEX = /^((\d{7,8})|(\d{11}))?$/

/** Teléfono solo dígitos, igual que el backend. Vacío también es válido. */
const TELEFONO_REGEX = /^\d*$/

/**
 * Formulario de edición del cliente (HU-33, modo EDICIÓN). Replica las reglas
 * del backend con mensajes en español: validar acá no lo reemplaza, es para no
 * gastar un round-trip en un error de tipeo.
 *
 * `nombre` es el único obligatorio porque es lo único que la base no admite
 * vacío. El resto queda opcional, y un campo que se deja en blanco se trata
 * como "sin cambios" al armar el payload: el backend no acepta strings vacíos,
 * así que no hay forma de vaciar un dato ya cargado.
 */
export const clienteFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  apellido: z
    .string()
    .trim()
    .max(100, 'El apellido no puede superar los 100 caracteres')
    .optional()
    .or(z.literal('')),
  dni_cuil: z
    .string()
    .trim()
    .regex(
      DNI_CUIL_REGEX,
      'El DNI/CUIL debe tener 7 u 8 dígitos (DNI) u 11 dígitos (CUIT/CUIL), sin puntos ni guiones'
    )
    .optional(),
  telefono: z
    .string()
    .trim()
    .regex(TELEFONO_REGEX, 'El teléfono debe contener solo números')
    .max(30, 'El teléfono no puede superar los 30 caracteres')
    .optional(),
  // Opcional y no obligatorio a propósito: con una cuenta de Google vinculada
  // el campo va deshabilitado, y React Hook Form omite el valor de un campo
  // deshabilitado. Si fuera obligatorio, el formulario quedaría inválido justo
  // en el caso en que el correo no se puede editar.
  email: z.email('El correo no es válido').optional().or(z.literal('')),
})

export type ClienteFormValues = z.input<typeof clienteFormSchema>
export type ClienteFormOutput = z.output<typeof clienteFormSchema>
