import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createImagenUnidadSchema = z.object({
  // Solo http(s): `javascript:` y compañía también son URLs válidas para Zod.
  url: z.url({ protocol: /^https?$/ }).max(500).meta({
    description: 'URL pública que devolvió POST /almacenamiento/imagenes',
  }),
  orden: z.number().int().min(0).optional().meta({
    description:
      'Posición en la galería, empezando en 0. Sin este dato, la imagen va al final.',
  }),
});

export class CreateImagenUnidadDto extends createZodDto(
  createImagenUnidadSchema,
) {}