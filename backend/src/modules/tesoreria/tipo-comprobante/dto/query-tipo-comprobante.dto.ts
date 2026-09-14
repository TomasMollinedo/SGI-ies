import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtros de listado: por nombre (búsqueda parcial), por estado y por efecto
 * sobre el saldo. Sin filtro de estado, el listado trae tanto los activos
 * como los dados de baja — el frontend es quien decide pedir solo los
 * activos por defecto.
 */
export const queryTipoComprobanteSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  aumenta_saldo: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryTipoComprobanteDto extends createZodDto(
  queryTipoComprobanteSchema,
) {}
