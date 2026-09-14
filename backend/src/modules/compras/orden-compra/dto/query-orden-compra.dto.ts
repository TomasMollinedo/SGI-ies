import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoOrdenCompra } from '../../../../../generated/prisma/enums';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros del listado: proveedor, estado, depósito y período, combinables
 * entre sí — los cuatro campos que ORDENCOMPRA indexa para este fin.
 * `fechaDesde`/`fechaHasta` filtran por `fecha_emision` (la fecha de
 * negocio), no por `hora_creacion`.
 */
export const queryOrdenCompraSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive().optional(),
  estado: z.enum(EstadoOrdenCompra).optional(),
  FK_deposito: z.coerce.number().int().positive().optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryOrdenCompraDto extends createZodDto(queryOrdenCompraSchema) {}
