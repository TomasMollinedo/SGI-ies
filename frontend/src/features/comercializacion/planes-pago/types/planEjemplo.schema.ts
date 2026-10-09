import { z } from 'zod'
import { decimalObligatorio } from './planPago.schema'

/**
 * Validación del formulario de plan de ejemplo (HU-22), calcada de
 * `create-plan-ejemplo.dto.ts` del backend. El plazo no está acá: se elige en
 * una tabla emergente y el formulario lo guarda aparte.
 *
 * El anticipo vive en el form como string (con coma, como lo escribe un
 * usuario en es-AR) y sale como `number`. El backend lo exige mayor a 0 y
 * menor a 100 %, con hasta dos decimales.
 */
export const anticipoPorcentajeSchema = decimalObligatorio({
  etiqueta: 'El anticipo',
  mayorACero: true,
}).refine((valor) => valor < 100, 'El anticipo debe ser menor a 100 %')

export const planEjemploFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre del plan es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  anticipo_porcentaje: anticipoPorcentajeSchema,
})

export type PlanEjemploFormValues = z.input<typeof planEjemploFormSchema>
export type PlanEjemploFormOutput = z.output<typeof planEjemploFormSchema>

/** Los campos del formulario, para saber qué issues del backend son de campo. */
export const CAMPOS_FORMULARIO = ['nombre', 'anticipo_porcentaje'] as const

export type CampoFormulario = (typeof CAMPOS_FORMULARIO)[number]

export function esCampoDelFormulario(campo: string): campo is CampoFormulario {
  return (CAMPOS_FORMULARIO as readonly string[]).includes(campo)
}

export const VALORES_INICIALES: PlanEjemploFormValues = {
  nombre: '',
  anticipo_porcentaje: '',
}
