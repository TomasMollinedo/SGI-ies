import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipologiaUnidad } from '../../../../../generated/prisma/enums';

/** Filtros de la tabla emergente (GET /publicaciones/unidades-publicables). */
export const queryUnidadesPublicablesSchema = z.object({
  FK_proyecto: z.coerce.number().int().positive().optional(),
  tipologia: z.enum(TipologiaUnidad).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryUnidadesPublicablesDto extends createZodDto(
  queryUnidadesPublicablesSchema,
) {}
