import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Paginación del historial del propio cliente. La HU no la pide
 * explícitamente, pero es un listado que puede crecer sin límite (un cliente
 * puede mandar muchas consultas) — mismo criterio de "todo listado que puede
 * crecer sin límite soporta `page`/`limit`" que el resto del backend.
 */
export const queryMisConsultasSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryMisConsultasDto extends createZodDto(
  queryMisConsultasSchema,
) {}
