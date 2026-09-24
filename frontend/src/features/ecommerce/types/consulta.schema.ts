import { z } from 'zod'
import { MAX_LARGO_CONSULTA } from '../config/consulta.config'

/** Límite calcado de `createConsultaSchema` (backend, `create-consulta.dto.ts`). */
export const enviarConsultaFormSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(1, 'Escribí tu consulta')
    .max(MAX_LARGO_CONSULTA, `La consulta no puede superar los ${MAX_LARGO_CONSULTA} caracteres`),
})

export type EnviarConsultaFormValues = z.input<typeof enviarConsultaFormSchema>
export type EnviarConsultaFormOutput = z.output<typeof enviarConsultaFormSchema>
