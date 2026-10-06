import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoVenta } from '../../../../../generated/prisma/enums';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros combinables del listado (HU-27): proyecto, unidad, cliente,
 * publicación, estado y período. `fechaDesde`/`fechaHasta` filtran por
 * `fecha_adhesion`, mismo patrón que `queryCobroSchema` sobre `fecha_cobro`.
 */
export const queryVentaSchema = z.object({
  FK_cliente: z.coerce.number().int().positive().optional(),
  FK_publicacion: z.coerce.number().int().positive().optional(),
  FK_unidad_funcional: z.coerce.number().int().positive().optional(),
  FK_proyecto: z.coerce.number().int().positive().optional(),
  estado: z.enum(EstadoVenta).optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryVentaDto extends createZodDto(queryVentaSchema) {}
