import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CLASE_FILA_MOVIMIENTO = [
  'APERTURA',
  'COMPROBANTE',
  'PAGO',
] as const;

/**
 * Una fila del extracto de cuenta corriente de un proveedor, ordenadas por
 * fecha ascendente. 'APERTURA' es sintética (no corresponde a ningún
 * comprobante/pago real): solo aparece cuando la query trae `fechaDesde`, y
 * resume en un solo número todo lo anterior a esa fecha para que
 * `saldo_acumulado` siga cerrando con el saldo real del proveedor.
 */
export const movimientoCuentaCorrienteSchema = z.object({
  clase: z.enum(CLASE_FILA_MOVIMIENTO),
  // id_comprobante_proveedor o id_pago según `clase`; null en la apertura.
  id_referencia: z.number().nullable(),
  fecha: z.iso.datetime(),
  // Nombre del tipo de comprobante (factura, nota de crédito...) o de la
  // forma de pago (transferencia, efectivo...) según `clase`; null en la
  // apertura.
  tipo: z.string().nullable(),
  letra: z.string().nullable(),
  punto_de_venta: z.number().nullable(),
  numero: z.number().nullable(),
  fecha_vencimiento: z.iso.datetime().nullable(),
  // Pasivo: factura/nota de débito → HABER (aumenta); nota de crédito/pago
  // → DEBE (disminuye). null en la apertura.
  debe: z.number().nullable(),
  haber: z.number().nullable(),
  saldo_acumulado: z.number(),
});

export const movimientosCuentaCorrienteResponseSchema = z.object({
  proveedor: z.object({
    id_proveedor: z.number(),
    razon_social: z.string(),
    cuit: z.string(),
  }),
  movimientos: z.array(movimientoCuentaCorrienteSchema),
});

export class MovimientosCuentaCorrienteResponseDto extends createZodDto(
  movimientosCuentaCorrienteResponseSchema,
) {}
