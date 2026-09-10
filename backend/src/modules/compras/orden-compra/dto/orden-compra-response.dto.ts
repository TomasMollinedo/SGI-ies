import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoOrdenCompra } from '../../../../../generated/prisma/enums';

const proveedorResumenSchema = z.object({
  id_proveedor: z.number(),
  razon_social: z.string(),
});

const depositoResumenSchema = z.object({
  id_deposito: z.number(),
  nombre: z.string(),
});

const articuloResumenSchema = z.object({
  id_articulo: z.number(),
  nombre: z.string(),
});

const lineaDetalleResponseSchema = z.object({
  id_detalle_orden_compra: z.number(),
  cantidad: z.number(),
  precio_unitario: z.number(),
  subtotal: z.number(),
  articulo: articuloResumenSchema,
});

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

const historialEstadoResponseSchema = z.object({
  id_historial: z.number(),
  estado_anterior: z.enum(EstadoOrdenCompra),
  estado_nuevo: z.enum(EstadoOrdenCompra),
  observacion: z.string().nullable(),
  fecha: z.iso.datetime(),
  usuario: usuarioResumenSchema,
});

/**
 * Shape completo de una orden de compra: lo que devuelven `create`, `update`,
 * `cambiarEstado` y `findOne` (todos pasan por `OrdenCompraService.findOne`
 * antes de responder).
 */
export const ordenCompraResponseSchema = z.object({
  id_orden_compra: z.number(),
  fecha_emision: z.iso.datetime(),
  fecha_entrega_solicitada: z.iso.datetime().nullable(),
  observaciones: z.string().nullable(),
  total: z.number(),
  estado: z.enum(EstadoOrdenCompra),
  motivo_cancelacion: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  proveedor: proveedorResumenSchema,
  deposito: depositoResumenSchema,
  detalles: z.array(lineaDetalleResponseSchema),
  historialEstados: z.array(historialEstadoResponseSchema),
});

export class OrdenCompraResponseDto extends createZodDto(
  ordenCompraResponseSchema,
) {}

// El listado no trae el detalle línea por línea ni el historial de estados
// (son carga innecesaria para una tabla) — mismo criterio que
// ProveedorListResponseDto, que tampoco expone lo que solo hace falta en el
// detalle.
export const ordenCompraListItemSchema = ordenCompraResponseSchema.omit({
  detalles: true,
  historialEstados: true,
});

export const ordenCompraListResponseSchema = z.object({
  data: z.array(ordenCompraListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class OrdenCompraListResponseDto extends createZodDto(
  ordenCompraListResponseSchema,
) {}
