import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import { estadoDeclaracionPagoSchema } from './declaracion-pago-response.dto';

/**
 * Filtros combinables de la bandeja de Tesorería (T117, HU-29): cliente,
 * forma de pago, estado y período. `fechaDesde`/`fechaHasta` filtran por
 * `hora_creacion` (cuándo declaró el cliente). Orden fijo (más antigua
 * primero, es una cola de trabajo), no configurable.
 */
export const queryDeclaracionPagoSchema = z.object({
  FK_cliente: z.coerce.number().int().positive().optional(),
  FK_forma_pago: z.coerce.number().int().positive().optional(),
  estado: estadoDeclaracionPagoSchema.optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryDeclaracionPagoDto extends createZodDto(
  queryDeclaracionPagoSchema,
) {}
