import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const MAX_LARGO_RESPUESTA = 1000;

/**
 * Responde una consulta pendiente. No existe un DTO de edición: una vez
 * enviada, la respuesta no se puede modificar — `ConsultaService.responder`
 * rechaza responder una consulta que ya esté RESPONDIDA.
 */
export const responderConsultaSchema = z.object({
  respuesta: z
    .string()
    .trim()
    .min(1, 'La respuesta es obligatoria')
    .max(
      MAX_LARGO_RESPUESTA,
      `La respuesta no puede superar los ${MAX_LARGO_RESPUESTA} caracteres`,
    ),
});

export class ResponderConsultaDto extends createZodDto(
  responderConsultaSchema,
) {}
