import { z } from 'zod'

/**
 * Schema del formulario de proyecto, con los mismos límites que
 * `camposProyecto` del backend (create-proyecto.dto.ts).
 *
 * Es una fábrica porque en edición las unidades planificadas no pueden quedar
 * por debajo de las unidades activas ya cargadas (`unidades_cargadas`): ese
 * mínimo depende del proyecto. En el alta el mínimo es el del backend, 1.
 *
 * Las fechas y la portada viajan como string y `''` significa "sin valor": es
 * lo que devuelve un `<input type="date">` vacío. Cómo se traduce eso al body
 * (omitir o `null`) lo resuelve `payloadProyecto.ts`.
 */
export function crearProyectoFormSchema(unidadesCargadas = 0) {
  return z
    .object({
      nombre: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(150, 'El nombre no puede superar los 150 caracteres'),
      direccion: z
        .string()
        .trim()
        .min(1, 'La dirección es obligatoria')
        .max(255, 'La dirección no puede superar los 255 caracteres'),
      localidad: z
        .string()
        .trim()
        .min(1, 'La localidad es obligatoria')
        .max(100, 'La localidad no puede superar los 100 caracteres'),
      // Un input numérico vacío llega como `NaN` vía `valueAsNumber` de RHF,
      // que no pasa el chequeo de tipo de `z.number()`: de ahí el mensaje.
      cantidad_unidades_planificadas: z
        .number({ message: 'La cantidad de unidades planificadas es obligatoria' })
        .int('La cantidad de unidades planificadas tiene que ser un número entero')
        .positive('La cantidad de unidades planificadas debe ser mayor a 0')
        .min(
          unidadesCargadas,
          `No puede ser menor a las unidades ya cargadas (${unidadesCargadas})`
        ),
      descripcion: z
        .string()
        .trim()
        .max(2000, 'La descripción no puede superar los 2000 caracteres'),
      fecha_inicio: z.string(),
      fecha_fin_estimada: z.string(),
      imagen_portada_url: z.string(),
    })
    .refine(
      // Las dos son `YYYY-MM-DD`: comparar los strings es comparar las fechas.
      (datos) =>
        !datos.fecha_inicio ||
        !datos.fecha_fin_estimada ||
        datos.fecha_fin_estimada >= datos.fecha_inicio,
      {
        message: 'La fecha de fin estimada no puede ser anterior a la fecha de inicio',
        path: ['fecha_fin_estimada'],
      }
    )
}

type ProyectoFormSchema = ReturnType<typeof crearProyectoFormSchema>

export type ProyectoFormValues = z.input<ProyectoFormSchema>
export type ProyectoFormOutput = z.output<ProyectoFormSchema>
