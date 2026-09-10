import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CONDICION_SALDO = ['DEUDOR', 'A_FAVOR', 'SIN_SALDO'] as const;

/**
 * Filtros de la cuenta corriente: por proveedor puntual y por condición de
 * saldo (deudor: saldo > 0, a favor: saldo < 0, sin saldo: saldo = 0). El
 * orden (saldo descendente) es fijo, no configurable por query param — mismo
 * criterio que el listado de comprobantes.
 */
export const queryCuentaCorrienteSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive().optional(),
  condicion_saldo: z.enum(CONDICION_SALDO).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryCuentaCorrienteDto extends createZodDto(
  queryCuentaCorrienteSchema,
) {}
