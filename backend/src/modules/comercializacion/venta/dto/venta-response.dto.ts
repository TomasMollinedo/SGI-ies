import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoCuota,
  EstadoVenta,
  Periodicidad,
  TipoPlanPago,
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

/**
 * Ítem del listado (criterio "Listado interno con filtros y paginación"): la
 * cabecera de la venta, sin el detalle de cuotas — eso es solo del detalle.
 */
export const ventaListItemSchema = z.object({
  id_venta: z.number(),
  fecha_adhesion: z.iso.datetime(),
  precio_congelado: z.number(),
  anticipo_congelado: z.number(),
  tipo_plan_congelado: z.enum(TipoPlanPago),
  cantidad_cuotas_congelada: z.number(),
  periodicidad_congelada: z.enum(Periodicidad).nullable(),
  estado: z.enum(EstadoVenta),
  motivo_cancelacion: z.string().nullable(),
  fecha_cancelacion: z.iso.datetime().nullable(),
  cliente: clienteResumenSchema,
  FK_publicacion: z.number(),
  FK_plan_pago: z.number(),
});

export const ventaListResponseSchema = z.object({
  data: z.array(ventaListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class VentaListResponseDto extends createZodDto(ventaListResponseSchema) {}

const cuotaVentaSchema = z.object({
  numero: z.number(),
  importe: z.number(),
  fecha_vencimiento: z.iso.datetime(),
  saldo_pendiente: z.number(),
  estado: z.enum(EstadoCuota),
});

/**
 * Detalle de una venta: la cabecera del listado más el cronograma completo
 * de cuotas generado por el motor de T105, y quién la registró.
 */
export const ventaDetalleResponseSchema = ventaListItemSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  cuotas: z.array(cuotaVentaSchema),
});

export class VentaDetalleResponseDto extends createZodDto(ventaDetalleResponseSchema) {}
