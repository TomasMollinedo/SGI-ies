import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoComercial,
  TipologiaUnidad,
} from '../../../../../generated/prisma/enums';

/**
 * Listado interno paginado (GET /publicaciones), con filtros combinables.
 * Sin `vigente`, trae todas las publicaciones, vigentes e históricas.
 */
export const queryPublicacionSchema = z.object({
  vigente: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  estado_comercial: z.enum(EstadoComercial).optional(),
  id_proyecto: z.coerce.number().int().positive().optional(),
  tipologia: z.enum(TipologiaUnidad).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryPublicacionDto extends createZodDto(queryPublicacionSchema) {}
