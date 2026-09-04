import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import { estadoOrdenPagoSchema } from './orden-pago-response.dto';

/**
 * Filtros combinables del listado: proveedor, forma de pago, estado y período. `fechaDesde`/`fechaHasta` filtran por `fecha_pago` (la fecha de
 * negocio), no por `hora_creacion`. El orden (más reciente primero) es fijo,
 * no configurable por query param.
 */
export const queryOrdenPagoSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive().optional(),
  FK_forma_pago: z.coerce.number().int().positive().optional(),
  estado: estadoOrdenPagoSchema.optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryOrdenPagoDto extends createZodDto(queryOrdenPagoSchema) {}
