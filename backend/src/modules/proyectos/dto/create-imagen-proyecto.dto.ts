import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipoImagenProyecto } from '../../../../generated/prisma/enums';

/**
 * La imagen ya está subida al almacenamiento de objetos: acá solo se
 * persiste la URL pública que devolvió POST /almacenamiento/imagenes, si es
 * un render o un plano, y su posición en la galería.
 */
export const createImagenProyectoSchema = z.object({
  // Solo http(s): `javascript:` y compañía también son URLs válidas para Zod.
  url: z
    .url({ protocol: /^https?$/ })
    .max(500)
    .meta({
      description: 'URL pública que devolvió POST /almacenamiento/imagenes',
    }),
  tipo: z.enum(TipoImagenProyecto),
  orden: z.number().int().min(0).optional().meta({
    description:
      'Posición en la galería, empezando en 0. Sin este dato, la imagen va al final.',
  }),
});

export class CreateImagenProyectoDto extends createZodDto(
  createImagenProyectoSchema,
) {}
