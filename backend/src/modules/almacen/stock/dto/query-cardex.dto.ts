import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros del cardex de una ficha de stock.
 *
 * El período filtra por `fecha_movimiento` (la fecha de negocio del
 * movimiento), igual que el listado de movimientos — no por la fecha de
 * registro. Filtrar NO recalcula los saldos: cada línea conserva el
 * `stock_anterior`/`stock_nuevo` con el que quedó registrada, así que un
 * cardex acotado a un período puede arrancar en un saldo distinto de cero.
 */
export const queryCardexSchema = z.object({
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryCardexDto extends createZodDto(queryCardexSchema) {}
