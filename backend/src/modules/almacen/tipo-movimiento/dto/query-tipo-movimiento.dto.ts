import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtros de listado: por nombre (búsqueda parcial), por estado y por
 * indicador de entrada/salida. Sin filtro de estado, el listado trae tanto
 * los activos como los dados de baja.
 */
export const queryTipoMovimientoSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  indicador_entrada: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryTipoMovimientoDto extends createZodDto(
  queryTipoMovimientoSchema,
) {}
