import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Largo máximo validado acá, no en la base: `CONSULTAUNIDAD.texto` es un
// `String` sin límite en el schema (ver comentario del modelo).
const MAX_LARGO_TEXTO = 1000;

/**
 * Alta de una consulta de cliente sobre una unidad (HU-26). El service
 * resuelve `FK_unidad_funcional` contra la publicación vigente y DISPONIBLE
 * de esa unidad — no se manda `FK_publicacion` a mano, el cliente solo
 * conoce el id de la unidad (es lo que expone el catálogo público).
 */
export const createConsultaSchema = z.object({
  FK_unidad_funcional: z.number().int().positive().meta({
    description: 'id_unidad_funcional de la unidad consultada',
  }),
  texto: z
    .string()
    .trim()
    .min(1, 'El texto de la consulta es obligatorio')
    .max(
      MAX_LARGO_TEXTO,
      `El texto no puede superar los ${MAX_LARGO_TEXTO} caracteres`,
    ),
});

export class CreateConsultaDto extends createZodDto(createConsultaSchema) {}
