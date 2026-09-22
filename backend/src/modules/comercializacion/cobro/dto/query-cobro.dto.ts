import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import { estadoCobroSchema } from './cobro-response.dto';

/**
 * Filtros combinables del listado: cliente, forma de pago, estado y período.
 * `fechaDesde`/`fechaHasta` filtran por `fecha_cobro` (la fecha de negocio),
 * no por `hora_creacion`. Orden fijo (más reciente primero), no configurable.
 */
export const queryCobroSchema = z.object({
  FK_cliente: z.coerce.number().int().positive().optional(),
  FK_forma_pago: z.coerce.number().int().positive().optional(),
  estado: estadoCobroSchema.optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryCobroDto extends createZodDto(queryCobroSchema) {}
