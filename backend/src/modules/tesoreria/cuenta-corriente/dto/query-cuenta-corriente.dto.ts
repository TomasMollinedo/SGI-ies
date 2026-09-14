import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { booleanQuerySchema } from '../../../../common/validaciones/boolean-query.schema';

export const CONDICION_SALDO = ['DEUDOR', 'A_FAVOR', 'SIN_SALDO'] as const;

/**
 * Filtros de la cuenta corriente: por proveedor puntual, por estado del
 * proveedor y por condición de saldo (deudor: saldo > 0, a favor: saldo < 0,
 * sin saldo: saldo = 0). El orden (saldo descendente) es fijo, no
 * configurable por query param — mismo criterio que el listado de
 * comprobantes.
 *
 * `estado` es distinto del criterio de `ProveedorService.findAll` a
 * propósito: acá es un reporte financiero, no un ABM, así que sin filtro
 * trae TODOS los proveedores (activos e inactivos) — un proveedor dado de
 * baja puede seguir teniendo saldo pendiente. `estado=true` filtra solo
 * activos, `estado=false` solo dados de baja.
 */
export const queryCuentaCorrienteSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive().optional(),
  condicion_saldo: z.enum(CONDICION_SALDO).optional(),
  estado: booleanQuerySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryCuentaCorrienteDto extends createZodDto(
  queryCuentaCorrienteSchema,
) {}
