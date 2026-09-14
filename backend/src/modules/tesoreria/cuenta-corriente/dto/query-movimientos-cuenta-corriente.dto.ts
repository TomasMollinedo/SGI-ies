import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

export const CLASE_MOVIMIENTO = ['COMPROBANTE', 'PAGO'] as const;

/**
 * Filtros del extracto de cuenta corriente de UN proveedor: por período
 * (sobre la fecha del movimiento: fecha_emision del comprobante o
 * fecha_pago del pago) y por clase. `clase` es solo de visualización — qué
 * filas se devuelven — nunca cambia cómo se calcula `saldo_acumulado`: cada
 * fila siempre lleva el saldo real (comprobantes + pagos), no uno
 * hipotético como si la otra clase no existiera.
 */
export const queryMovimientosCuentaCorrienteSchema = z.object({
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  clase: z.enum(CLASE_MOVIMIENTO).optional(),
});

export class QueryMovimientosCuentaCorrienteDto extends createZodDto(
  queryMovimientosCuentaCorrienteSchema,
) {}
