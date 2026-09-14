import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoComprobante } from '../../../../../generated/prisma/enums';

/**
 * Estado de saldo, expuesto en el contrato como enum simétrico al estado del
 * documento (HU-16) aunque en la base sea `saldo_cancelado: Boolean?`. Todo
 * comprobante REGISTRADO tiene estado de saldo, cualquiera sea el efecto de
 * su tipo sobre el saldo del proveedor; viaja `null` solo mientras está en
 * BORRADOR o si fue ANULADO. La traducción boolean↔enum la hace el service:
 * `saldo_cancelado` false → `PENDIENTE`, true → `SALDADO`, null → `null`.
 */
export const ESTADO_SALDO = ['PENDIENTE', 'SALDADO'] as const;
export const estadoSaldoSchema = z.enum(ESTADO_SALDO);

const lineaDetalleResponseSchema = z.object({
  id_detalle_comprobante: z.number(),
  descripcion: z.string(),
  FK_articulo: z.number().nullable(),
  cantidad: z.number(),
  precio_unitario: z.number(),
  subtotal: z.number(),
});

export const comprobanteResponseSchema = z.object({
  id_comprobante_proveedor: z.number(),
  FK_tipo_comprobante: z.number(),
  letra: z.string(),
  punto_de_venta: z.number(),
  numero: z.number(),
  fecha_emision: z.iso.datetime(),
  fecha_vencimiento: z.iso.datetime(),
  FK_proveedor: z.number(),
  FK_orden_compra: z.number().nullable(),
  FK_comprobante_origen: z.number().nullable(),
  observaciones: z.string().nullable(),
  importe_neto: z.number(),
  alicuota_iva: z.number(),
  importe_iva: z.number(),
  importe_total: z.number(),

  saldo_pendiente: z.number().nullable(),
  estado: z.enum(EstadoComprobante),
  estado_saldo: estadoSaldoSchema.nullable(),
  motivo_anulacion: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class ComprobanteResponseDto extends createZodDto(
  comprobanteResponseSchema,
) {}
/** Datos identificatorios del proveedor, para no devolver solo el `FK_proveedor` en listado/detalle. */
const proveedorResumenSchema = z.object({
  id_proveedor: z.number(),
  razon_social: z.string(),
});

/** Datos identificatorios del tipo de comprobante (mismo criterio que `proveedor`). */
const tipoComprobanteResumenSchema = z.object({
  id_tipo_comprobante: z.number(),
  nombre: z.string(),
});
/**
 * Listado (HU-16): tipo, letra, punto de venta, número, fechas, proveedor,
 * importe total, saldo pendiente, estado y estado de saldo — no el detalle
 * completo ni los datos de auditoría, eso lo trae el detalle.
 */
export const comprobanteListItemSchema = comprobanteResponseSchema.pick({
  id_comprobante_proveedor: true,
  FK_tipo_comprobante: true,
  letra: true,
  punto_de_venta: true,
  numero: true,
  fecha_emision: true,
  fecha_vencimiento: true,
  FK_proveedor: true,
  importe_total: true,
  saldo_pendiente: true,
  estado: true,
  estado_saldo: true,
})
 .extend({
    proveedor: proveedorResumenSchema,
    tipoComprobante: tipoComprobanteResumenSchema,
  });

export const comprobanteListResponseSchema = z.object({
  data: z.array(comprobanteListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ComprobanteListResponseDto extends createZodDto(
  comprobanteListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Orden de pago que imputó este comprobante (HU-18). El módulo de Órdenes de
 * Pago todavía no existe — este shape es lo mínimo que ya define el schema
 * (ORDENPAGO + DETALLEORDENPAGO); se termina de ajustar cuando se construya
 * esa HU.
 */
const ordenPagoResumenSchema = z.object({
  id_pago: z.number(),
  fecha_pago: z.iso.datetime(),
  importe_imputado: z.number(),
});

/**
 * Detalle (GET /comprobantes/:id): cabecera completa, líneas, el comprobante
 * de origen o las notas aplicadas sobre él, y las órdenes de pago que lo
 * imputaron.
 */
export const comprobanteDetalleResponseSchema =
  comprobanteResponseSchema.extend({
    detalle: z.array(lineaDetalleResponseSchema),
    proveedor: proveedorResumenSchema,
    tipoComprobante: tipoComprobanteResumenSchema,
    comprobanteOrigen: comprobanteListItemSchema.nullable(),
    notasAplicadas: z.array(comprobanteListItemSchema),
    pagos: z.array(ordenPagoResumenSchema),
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class ComprobanteDetalleResponseDto extends createZodDto(
  comprobanteDetalleResponseSchema,
) {}

export type ComprobanteResponse = z.infer<typeof comprobanteResponseSchema>;
export type ComprobanteListItem = z.infer<typeof comprobanteListItemSchema>;
export type ComprobanteDetalleResponse = z.infer<
  typeof comprobanteDetalleResponseSchema
>;
