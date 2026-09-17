import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const imagenResponseSchema = z.object({
  url: z.url(),
});

export class ImagenResponseDto extends createZodDto(imagenResponseSchema) {}
