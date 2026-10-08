import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoCuota,
  EstadoVenta,
  ModalidadPago,
  TipologiaUnidad,
} from '../../../../../generated/prisma/enums';

export const clienteResumenSchema = z.object({
  id_cliente: z.number(),
  nombre: z.string(),
  apellido: z.string().nullable(),
  dni_cuil: z.string().nullable(),
  email: z.email(),
  telefono: z.string().nullable(),
});

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/** Mismo shape que `UnidadResumen`/`ProyectoPublicacion` de `PublicacionListItem` (`publicacion.service.ts`). */
const unidadResumenSchema = z.object({
  id_unidad_funcional: z.number(),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
});

const proyectoResumenSchema = z.object({
  id_proyecto: z.number(),
  codigo: z.string(),
  nombre: z.string(),
});

/**
 * El plan de pago acordado en la venta (HU-27), leído de su PLANPAGO (ver
 * `resolverPlanAcordado`): lo que quedó congelado al confirmarla. Cambiar
 * después el precio de lista o la TNA del plazo no lo modifica.
 *
 * Saldo financiado, total de intereses y total a pagar no se guardan: se
 * derivan del plan y de su cronograma. En CONTADO no hay plazo, cuotas, tasa
 * ni valor de cuota (vienen en `null`), el anticipo es el precio completo y
 * el saldo financiado es 0.
 */
const planVentaSchema = z.object({
  modalidad: z.enum(ModalidadPago),
  precio: z.number(),
  anticipo: z.number(),
  saldo_financiado: z.number(),
  /** `null` en CONTADO y en las ventas del Sprint 3 (sin plazo, TNA 0 %). */
  plazo: z
    .object({ id_plazo_financiacion: z.number(), codigo: z.string() })
    .nullable(),
  cantidad_cuotas: z.number().nullable(),
  /** TNA en porcentaje (24 = 24 %). */
  tasa_nominal_anual: z.number().nullable(),
  valor_cuota: z.number().nullable(),
  total_intereses: z.number(),
  total_a_pagar: z.number(),
});

/**
 * Ítem del listado (HU-27): la venta, el cliente, la unidad, el plan acordado
 * y el saldo pendiente. Sin el cronograma de cuotas: eso es del detalle.
 */
export const ventaListItemSchema = z.object({
  id_venta: z.number(),
  fecha_venta: z.iso.datetime(),
  estado: z.enum(EstadoVenta),
  motivo_cancelacion: z.string().nullable(),
  fecha_cancelacion: z.iso.datetime().nullable(),
  cliente: clienteResumenSchema,
  FK_publicacion: z.number(),
  unidad: unidadResumenSchema,
  proyecto: proyectoResumenSchema,
  plan: planVentaSchema,
  /** Suma del saldo pendiente de sus cuotas; 0 en una venta cancelada (sus cuotas quedan ANULADA). */
  saldo_pendiente: z.number(),
});

export const ventaListResponseSchema = z.object({
  data: z.array(ventaListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class VentaListResponseDto extends createZodDto(
  ventaListResponseSchema,
) {}

/**
 * Una cuota del cronograma, con el desglose del sistema francés:
 * `importe` = `importe_capital` + `importe_interes`. `saldo_capital` es la
 * deuda del plan después de esa cuota (fijo); `saldo_pendiente` es lo que
 * falta pagar de esa cuota (lo modifican los cobros).
 */
const cuotaVentaSchema = z.object({
  id_cuota: z.number(),
  numero: z.number(),
  fecha_vencimiento: z.iso.datetime(),
  importe_capital: z.number(),
  importe_interes: z.number(),
  importe: z.number(),
  saldo_capital: z.number(),
  saldo_pendiente: z.number(),
  estado: z.enum(EstadoCuota),
});

/**
 * Detalle de una venta: lo mismo que el listado, más el cronograma completo
 * de su plan de pago y quién la registró.
 */
export const ventaDetalleResponseSchema = ventaListItemSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  cuotas: z.array(cuotaVentaSchema),
});

export class VentaDetalleResponseDto extends createZodDto(
  ventaDetalleResponseSchema,
) {}
