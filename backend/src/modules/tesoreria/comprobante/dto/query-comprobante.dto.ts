import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoComprobante } from '../../../../../generated/prisma/enums';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import { estadoSaldoSchema } from './comprobante-response.dto';

/**
 * Filtros combinables del listado (HU-16): proveedor, tipo, efecto del tipo
 * sobre el saldo, estado del comprobante, estado de saldo y período — sobre
 * `fecha_emision`, la fecha de negocio. El orden (más reciente al más
 * antiguo) es fijo, no configurable por query param.
 */
export const queryComprobanteSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive().optional(),
  FK_tipo_comprobante: z.coerce.number().int().positive().optional(),
  // "Efecto sobre el saldo": filtra por comprobantes cuyo tipo aumenta
  // (`true`) o disminuye (`false`) el saldo del proveedor
  // (`TIPOCOMPROBANTE.aumenta_saldo`). El service lo traduce a un filtro
  // sobre la relación con el tipo de comprobante.
  aumenta_saldo: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  estado: z.enum(EstadoComprobante).optional(),
  estado_saldo: estadoSaldoSchema.optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryComprobanteDto extends createZodDto(queryComprobanteSchema) {}
