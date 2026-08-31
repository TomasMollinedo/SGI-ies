import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros del listado de movimientos. `fechaDesde`/`fechaHasta` filtran por
 * `fecha_movimiento` (la fecha de negocio), no por `hora_creacion`.
 */
export const queryMovimientoSchema = z.object({
  FK_Deposito: z.coerce.number().int().positive().optional(),
  FK_TipoMovimiento: z.coerce.number().int().positive().optional(),
  // Filtra por el artículo de las líneas del detalle: no es un campo de
  // MOVIMIENTO, se resuelve por la relación stockMovimientos -> stock.
  FK_articulo: z.coerce.number().int().positive().optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryMovimientoDto extends createZodDto(queryMovimientoSchema) {}
