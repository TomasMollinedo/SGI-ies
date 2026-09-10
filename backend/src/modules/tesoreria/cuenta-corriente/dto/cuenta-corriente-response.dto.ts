import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Saldo actual del proveedor: Σ saldo_pendiente de comprobantes REGISTRADOS
 * cuyo tipo aumenta el saldo (DEBE, facturas) − Σ de los que lo disminuyen
 * (HABER, notas de crédito). Positivo = deuda de la empresa hacia el
 * proveedor; negativo = crédito a favor de la empresa; cero = sin saldo.
 */
export const cuentaCorrienteItemSchema = z.object({
  id_proveedor: z.number(),
  razon_social: z.string(),
  cuit: z.string(),
  // Del proveedor, no del comprobante: sin filtro `estado` la lista trae
  // activos e inactivos mezclados, esto permite distinguirlos.
  estado: z.boolean(),
  saldo: z.number(),
  // Cuenta comprobantes REGISTRADOS con saldo_cancelado=false, sean DEBE o
  // HABER: cualquier comprobante que todavía tiene saldo por imputar.
  cantidad_comprobantes_pendientes: z.number(),
  // fecha_vencimiento más antigua entre esos mismos comprobantes pendientes;
  // null si el proveedor no tiene ninguno.
  vencimiento_mas_antiguo: z.iso.datetime().nullable(),
});

/**
 * Cantidad de proveedores en cada condición de saldo y balance neto (Σ saldo
 * de TODOS los proveedores, positivo = la empresa es deudora en conjunto,
 * negativo = acreedora, cero = saldado), sobre el total de proveedores que
 * matchean `FK_proveedor` y `estado` — SIN aplicar el filtro
 * `condicion_saldo`, para que la card de resumen no cambie según qué
 * pestaña/filtro esté mirando la tabla.
 */
export const resumenCuentaCorrienteSchema = z.object({
  deudores: z.number(),
  a_favor: z.number(),
  sin_saldo: z.number(),
  saldo_total: z.number(),
});

export const cuentaCorrienteListResponseSchema = z.object({
  data: z.array(cuentaCorrienteItemSchema),
  resumen: resumenCuentaCorrienteSchema,
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class CuentaCorrienteListResponseDto extends createZodDto(
  cuentaCorrienteListResponseSchema,
) {}
