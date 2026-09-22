import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Estados del contrato de la API: solo los dos que este módulo usa de
 * verdad. `BORRADOR` existe en la base (columna `@default`), pero el
 * service siempre crea con `estado: 'CONFIRMADO'` explícito, así que ese
 * default nunca llega a aplicarse — mismo criterio que `ESTADO_PAGO` en
 * `pago-response.dto.ts`.
 */
export const ESTADO_COBRO = ['CONFIRMADO', 'ANULADO'] as const;
export const estadoCobroSchema = z.enum(ESTADO_COBRO);

const clienteResumenSchema = z.object({
  id_cliente: z.number(),
  nombre: z.string(),
  apellido: z.string().nullable(),
  dni_cuil: z.string().nullable(),
  email: z.email(),
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

/** Datos identificatorios de la cuota imputada en una línea del cobro. */
const cuotaResumenSchema = z.object({
  id_cuota: z.number(),
  numero: z.number(),
  FK_venta: z.number(),
});

/**
 * Una línea de imputación tal como quedó registrada. `saldo_anterior` y
 * `saldo_posterior` son la foto del saldo de la cuota al momento de
 * confirmar el cobro: se conservan tal cual y NUNCA se recalculan al
 * consultarlas — mismo criterio que `lineaPagoResponseSchema`.
 */
const lineaCobroResponseSchema = z.object({
  id_detalle_cobro: z.number(),
  FK_cuota: z.number(),
  importe_imputado: z.number(),
  saldo_anterior: z.number(),
  saldo_posterior: z.number(),
  cuota: cuotaResumenSchema,
});

/**
 * Cabecera completa. El identificador que ve el usuario es `id_cobro` — no
 * hay una columna `numero` aparte, mismo criterio que `PAGO`/`id_pago`.
 */
export const cobroResponseSchema = z.object({
  id_cobro: z.number(),
  fecha_cobro: z.iso.datetime(),
  numero_referencia: z.string().nullable(),
  importe_total: z.number(),
  observaciones: z.string().nullable(),
  origen: z.enum(['PRESENCIAL', 'ECOMMERCE']),
  estado: estadoCobroSchema,
  motivo_anulacion: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_cliente: z.number(),
  FK_forma_pago: z.number(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
  cliente: clienteResumenSchema,
  formaPago: formaPagoResumenSchema,
});

export class CobroResponseDto extends createZodDto(cobroResponseSchema) {}

/**
 * Ítem del listado: cabecera sin el detalle de imputaciones ni los datos de
 * auditoría — eso lo trae el detalle (GET /cobros/:id).
 */
export const cobroListItemSchema = cobroResponseSchema.omit({
  observaciones: true,
  motivo_anulacion: true,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_cliente: true,
  FK_forma_pago: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

/**
 * Control de ingresos del período: total + subtotales por cliente y por
 * forma de pago. Se calcula siempre sobre cobros CONFIRMADO, excluyendo los
 * anulados sin importar qué filtro de `estado` haya pedido la query — mismo
 * criterio que `resumenPeriodoSchema` de Pagos.
 */
export const resumenPeriodoCobroSchema = z.object({
  totalIngresos: z.number(),
  subtotalesPorCliente: z.array(
    z.object({ cliente: clienteResumenSchema, total: z.number() }),
  ),
  subtotalesPorFormaPago: z.array(
    z.object({ formaPago: formaPagoResumenSchema, total: z.number() }),
  ),
});

export const cobroListResponseSchema = z.object({
  data: z.array(cobroListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
  // null salvo que la query traiga fechaDesde y fechaHasta juntas.
  resumenPeriodo: resumenPeriodoCobroSchema.nullable(),
});

export class CobroListResponseDto extends createZodDto(
  cobroListResponseSchema,
) {}

/** Detalle (POST y GET /cobros/:id): cabecera completa + las líneas de imputación + auditoría. */
export const cobroDetalleResponseSchema = cobroResponseSchema.extend({
  detalle: z.array(lineaCobroResponseSchema),
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class CobroDetalleResponseDto extends createZodDto(
  cobroDetalleResponseSchema,
) {}

/**
 * Una cuota imputable, tal como la necesita el formulario de cobro: con
 * venta y unidad para identificarla, y los días de atraso como dato de
 * apoyo para decidir cuáles marcar. `dias_vencido` es 0 si todavía no venció.
 */
export const cuotaImputableSchema = z.object({
  id_cuota: z.number(),
  numero: z.number(),
  fecha_vencimiento: z.iso.datetime(),
  importe: z.number(),
  saldo_pendiente: z.number(),
  vencido: z.boolean(),
  dias_vencido: z.number(),
  venta: z.object({
    id_venta: z.number(),
    unidad: z.object({ identificador: z.string() }),
  }),
});

/** Sin paginar a propósito: el formulario necesita ver todas las cuotas imputables de una vez. */
export const cuotasImputablesResponseSchema = z.object({
  data: z.array(cuotaImputableSchema),
});

export class CuotasImputablesResponseDto extends createZodDto(
  cuotasImputablesResponseSchema,
) {}

/** Una cuota vencida, con cliente y proyecto para poder ubicarla sin filtrar. */
export const cuotaVencidaSchema = z.object({
  id_cuota: z.number(),
  numero: z.number(),
  fecha_vencimiento: z.iso.datetime(),
  importe: z.number(),
  saldo_pendiente: z.number(),
  dias_vencido: z.number(),
  cliente: z.object({
    id_cliente: z.number(),
    nombre: z.string(),
    apellido: z.string().nullable(),
  }),
  venta: z.object({
    id_venta: z.number(),
    unidad: z.object({ identificador: z.string() }),
    proyecto: z.object({ id_proyecto: z.number(), nombre: z.string() }),
  }),
});

export const cuotasVencidasResponseSchema = z.object({
  data: z.array(cuotaVencidaSchema),
});

export class CuotasVencidasResponseDto extends createZodDto(
  cuotasVencidasResponseSchema,
) {}
