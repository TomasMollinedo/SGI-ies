import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Reordenar la galería: la lista completa de imágenes, en el orden nuevo. El
 * orden es uno solo para todo el proyecto, no uno por tipo de imagen.
 */
export const ordenarImagenesProyectoSchema = z.object({
  ids_imagen_proyecto: z
    .array(z.number().int().positive())
    .min(1, 'Hay que indicar al menos una imagen')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'No puede haber imágenes repetidas',
    )
    .meta({
      description:
        'Ids de TODAS las imágenes del proyecto (renders y planos), en el orden nuevo: la primera queda con orden 0',
      example: [12, 10, 11],
    }),
});

export class OrdenarImagenesProyectoDto extends createZodDto(
  ordenarImagenesProyectoSchema,
) {}
