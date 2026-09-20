import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/** Reordenar la galería: la lista completa de imágenes, en el orden nuevo. */
export const ordenarImagenesUnidadSchema = z.object({
  ids_imagen_unidad: z
    .array(z.number().int().positive())
    .min(1, 'Hay que indicar al menos una imagen')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'No puede haber imágenes repetidas',
    )
    .meta({
      description:
        'Ids de TODAS las imágenes de la unidad, en el orden nuevo: la primera queda con orden 0',
      example: [12, 10, 11],
    }),
});

export class OrdenarImagenesUnidadDto extends createZodDto(
  ordenarImagenesUnidadSchema,
) {}