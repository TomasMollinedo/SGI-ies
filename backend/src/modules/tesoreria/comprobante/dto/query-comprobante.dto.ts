import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoComprobante } from '../../../../../generated/prisma/enums';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import { estadoSaldoSchema } from './comprobante-response.dto';

/**
 * Filtros combinables del listado (HU-16): proveedor, tipo, estado del
 * comprobante, estado de saldo y período — sobre `fecha_emision`, la fecha de
 * negocio. El orden (más reciente al más antiguo) es fijo, no configurable
 * por query param.
 */
export const queryComprobanteSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive().optional(),
  FK_tipo_comprobante: z.coerce.number().int().positive().optional(),
  estado: z.enum(EstadoComprobante).optional(),
  estado_saldo: estadoSaldoSchema.optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryComprobanteDto extends createZodDto(
  queryComprobanteSchema,
) {}