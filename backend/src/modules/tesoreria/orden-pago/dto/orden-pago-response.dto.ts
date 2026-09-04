import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Estados del contrato de la API. Acá se expone un enum propio con solo
 * los dos valores que esta HU usa, para que ese estado nunca sea
 * representable en el contrato. El service siempre crea con
 * `estado: 'CONFIRMADA'` explícito, así que el `@default(BORRADOR)` de la
 * base nunca llega a aplicarse. Mismo criterio que `ESTADO_SALDO` en
 * `comprobante-response.dto.ts`.
 */
export const ESTADO_ORDEN_PAGO = ['CONFIRMADA', 'ANULADA'] as const;
export const estadoOrdenPagoSchema = z.enum(ESTADO_ORDEN_PAGO);

const proveedorResumenSchema = z.object({
  id_proveedor: z.number(),
  razon_social: z.string(),
});

const formaPagoResumenSchema = z.object({
  id_forma_pago: z.number(),
  nombre: z.string(),
  requiere_referencia: z.boolean(),
});

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/** Datos identificatorios del comprobante imputado en una línea. */
const comprobanteResumenSchema = z.object({
  id_comprobante_proveedor: z.number(),
  FK_tipo_comprobante: z.number(),
  letra: z.string(),
  punto_de_venta: z.number(),
  numero: z.number(),
});

/**
 * Una línea de imputación tal como quedó registrada. `saldo_anterior` y
 * `saldo_posterior` son la foto del saldo del comprobante al momento de
 * confirmar la orden de pago: se conservan tal cual y NUNCA se recalculan al
 * consultarlas, mismo criterio que `STOCKMOVIMIENTO.stock_anterior`/
 * `stock_nuevo`.
 */
const lineaOrdenPagoResponseSchema = z.object({
  id_detalle_orden_pago: z.number(),
  FK_comprobante_proveedor: z.number(),
  importe_imputado: z.number(),
  saldo_anterior: z.number(),
  saldo_posterior: z.number(),
  comprobante: comprobanteResumenSchema,
});

/**
 * Cabecera completa. El "identificador generado por el sistema" que pide la
 * HU es `id_orden_pago` — no hay un campo `numero` aparte (mismo criterio que
 * `ORDENCOMPRA`/`id_orden_compra`).
 */
export const ordenPagoResponseSchema = z.object({
  id_orden_pago: z.number(),
  fecha_pago: z.iso.datetime(),
  numero_referencia: z.string().nullable(),
  importe_total: z.number(),
  observaciones: z.string().nullable(),
  estado: estadoOrdenPagoSchema,
  motivo_anulacion: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_proveedor: z.number(),
  FK_forma_pago: z.number(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
  proveedor: proveedorResumenSchema,
  formaPago: formaPagoResumenSchema,
});

export class OrdenPagoResponseDto extends createZodDto(
  ordenPagoResponseSchema,
) {}

/**
 * Ítem del listado (criterio 18): número, fecha, proveedor, forma de pago,
 * importe total y estado — sin el detalle de imputaciones ni los datos de
 * auditoría, eso lo trae el detalle (GET /ordenes-pago/:id).
 */
export const ordenPagoListItemSchema = ordenPagoResponseSchema.omit({
  observaciones: true,
  motivo_anulacion: true,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_proveedor: true,
  FK_forma_pago: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const ordenPagoListResponseSchema = z.object({
  data: z.array(ordenPagoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class OrdenPagoListResponseDto extends createZodDto(
  ordenPagoListResponseSchema,
) {}

/**
 * Detalle (POST y GET /ordenes-pago/:id): cabecera completa + las líneas de
 * imputación + quién la creó/actualizó. Es el shape que alimenta también el
 * documento imprimible que pide la HU.
 */
export const ordenPagoDetalleResponseSchema = ordenPagoResponseSchema.extend({
  detalle: z.array(lineaOrdenPagoResponseSchema),
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class OrdenPagoDetalleResponseDto extends createZodDto(
  ordenPagoDetalleResponseSchema,
) {}

/**
 * Un comprobante imputable, tal como lo necesita el formulario de emisión
 * (HU-18, T86): datos de identificación, importes, y los días transcurridos
 * desde el vencimiento como dato de apoyo para decidir cuáles imputar.
 * `dias_vencido` es 0 cuando el comprobante todavía no venció.
 */
export const comprobanteImputableSchema = z.object({
  id_comprobante_proveedor: z.number(),
  FK_tipo_comprobante: z.number(),
  tipo_comprobante_nombre: z.string(),
  letra: z.string(),
  punto_de_venta: z.number(),
  numero: z.number(),
  fecha_emision: z.iso.datetime(),
  fecha_vencimiento: z.iso.datetime(),
  importe_total: z.number(),
  saldo_pendiente: z.number(),
  vencido: z.boolean(),
  dias_vencido: z.number(),
});

/**
 * Sin `meta`/paginación a propósito: el formulario de imputación necesita ver
 * todos los comprobantes imputables del proveedor de una vez.
 */
export const comprobantesImputablesResponseSchema = z.object({
  data: z.array(comprobanteImputableSchema),
});

export class ComprobantesImputablesResponseDto extends createZodDto(
  comprobantesImputablesResponseSchema,
) {}
