import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Publicar solo necesita la unidad: identificador, proyecto, tipología,
 * superficies, comodidades e imágenes se heredan en vivo por relación desde
 * `UNIDADFUNCIONAL` y nunca se duplican acá.
 */
export const createPublicacionSchema = z.object({
  FK_unidad_funcional: z.number().int().positive(),
});

export class CreatePublicacionDto extends createZodDto(
  createPublicacionSchema,
) {}
