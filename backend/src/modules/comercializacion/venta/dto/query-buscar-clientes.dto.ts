import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtro del buscador de clientes por texto libre: cada palabra de
 * `busqueda` puede coincidir parcialmente con nombre, apellido, dni_cuil o
 * email. Paginado porque, sin exigir un campo único, la búsqueda puede
 * devolver más de un cliente.
 */
export const queryBuscarClientesSchema = z.object({
  busqueda: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export class QueryBuscarClientesDto extends createZodDto(
  queryBuscarClientesSchema,
) {}
