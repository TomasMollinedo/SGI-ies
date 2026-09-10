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
export const ESTADO_PAGO = ['CONFIRMADA', 'ANULADA'] as const;
export const estadoPagoSchema = z.enum(ESTADO_PAGO);

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
 * confirmar el pago: se conservan tal cual y NUNCA se recalculan al
 * consultarlas, mismo criterio que `STOCKMOVIMIENTO.stock_anterior`/
 * `stock_nuevo`.
 */
const lineaPagoResponseSchema = z.object({
  id_detalle_pago: z.number(),
  FK_comprobante_proveedor: z.number(),
  importe_imputado: z.number(),
  saldo_anterior: z.number(),
  saldo_posterior: z.number(),
  comprobante: comprobanteResumenSchema,
});

/**
 * Cabecera completa. El "identificador generado por el sistema" que pide la
 * HU es `id_pago` — no hay un campo `numero` aparte (mismo criterio que
 * `ORDENCOMPRA`/`id_orden_compra`). El documento imprimible "orden de pago"
 * usa este mismo número.
 */
export const pagoResponseSchema = z.object({
  id_pago: z.number(),
  fecha_pago: z.iso.datetime(),
  numero_referencia: z.string().nullable(),
  importe_total: z.number(),
  observaciones: z.string().nullable(),
  estado: estadoPagoSchema,
  motivo_anulacion: z.string().nullable(),
  // Foto de los datos bancarios del proveedor al confirmar (HU-12): quedan
  // en null si el proveedor no los tenía cargados en ese momento — ver
  // PagoService.obtenerDatosBancariosProveedor.
  banco_utilizado: z.string().nullable(),
  titular_utilizado: z.string().nullable(),
  cbu_utilizado: z.string().nullable(),
  alias_utilizado: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_proveedor: z.number(),
  FK_forma_pago: z.number(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
  proveedor: proveedorResumenSchema,
  formaPago: formaPagoResumenSchema,
});

export class PagoResponseDto extends createZodDto(pagoResponseSchema) {}

/**
 * Ítem del listado (criterio 18): número, fecha, proveedor, forma de pago,
 * importe total y estado — sin el detalle de imputaciones ni los datos de
 * auditoría, eso lo trae el detalle (GET /pagos/:id).
 */
export const pagoListItemSchema = pagoResponseSchema.omit({
  observaciones: true,
  motivo_anulacion: true,
  banco_utilizado: true,
  titular_utilizado: true,
  cbu_utilizado: true,
  alias_utilizado: true,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_proveedor: true,
  FK_forma_pago: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

/**
 * Control de egresos (criterio del listado): total del período + subtotales
 * por proveedor y por forma de pago. Se calcula siempre sobre pagos
 * CONFIRMADA, excluyendo los anulados sin importar qué filtro de `estado`
 * haya pedido la query — es un indicador de caja, no un filtro más.
 */
export const resumenPeriodoSchema = z.object({
  totalEgresos: z.number(),
  subtotalesPorProveedor: z.array(
    z.object({
      proveedor: proveedorResumenSchema,
      total: z.number(),
    }),
  ),
  subtotalesPorFormaPago: z.array(
    z.object({
      formaPago: formaPagoResumenSchema,
      total: z.number(),
    }),
  ),
});

export const pagoListResponseSchema = z.object({
  data: z.array(pagoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
  // null salvo que la query traiga fechaDesde y fechaHasta juntas — ver
  // PagoController/Service.calcularResumenPeriodo.
  resumenPeriodo: resumenPeriodoSchema.nullable(),
});

export class PagoListResponseDto extends createZodDto(pagoListResponseSchema) {}

/**
 * Detalle (POST y GET /pagos/:id): cabecera completa + las líneas de
 * imputación + quién la creó/actualizó. Es el shape que alimenta también el
 * documento imprimible ("orden de pago") que pide la HU.
 */
export const pagoDetalleResponseSchema = pagoResponseSchema.extend({
  detalle: z.array(lineaPagoResponseSchema),
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class PagoDetalleResponseDto extends createZodDto(
  pagoDetalleResponseSchema,
) {}

/**
 * DEBE = comprobante cuyo tipo aumenta el saldo (factura); HABER = lo
 * disminuye (nota de crédito). Ambos se listan como imputables por igual
 * (ver `PagoService.listarComprobantesImputables`); esto es lo que le
 * permite al frontend sumar o restar cada línea en la previsualización del
 * importe neto del pago.
 */
export const EFECTO_SALDO = ['DEBE', 'HABER'] as const;
export const efectoSaldoSchema = z.enum(EFECTO_SALDO);

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
  efecto_saldo: efectoSaldoSchema,
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
