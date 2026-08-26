import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const stockResponseSchema = z.object({
  id_stock: z.number(),
  cantidad: z.number(),
  umbral_minimo: z.number(),
  observaciones: z.string().nullable(),
  estado: z.boolean(),
  FK_articulo: z.number(),
  FK_deposito: z.number(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class StockResponseDto extends createZodDto(stockResponseSchema) {}

// Sin código porque ARTICULO todavía no lo tiene (ver inconsistencia
// pendiente). FK_Marca nullable porque ARTICULO.FK_Marca es opcional.
const articuloResumenSchema = z.object({
  id_articulo: z.number(),
  nombre: z.string(),
  FK_Categoria: z.number(),
  FK_Marca: z.number().nullable(),
});

const depositoResumenSchema = z.object({
  id_deposito: z.number(),
  nombre: z.string(),
  es_obrador: z.boolean(),
});

export const stockListItemSchema = stockResponseSchema
  .omit({
    hora_creacion: true,
    hora_actualizacion: true,
    FK_usuario_creador: true,
    FK_usuario_actualizador: true,
  })
  .extend({
    articulo: articuloResumenSchema,
    deposito: depositoResumenSchema,
  });

export const stockListResponseSchema = z.object({
  data: z.array(stockListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class StockListResponseDto extends createZodDto(
  stockListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

export const stockDetalleResponseSchema = stockResponseSchema.extend({
  articulo: articuloResumenSchema,
  deposito: depositoResumenSchema,
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class StockDetalleResponseDto extends createZodDto(
  stockDetalleResponseSchema,
) {}

export const stockConsolidadoResponseSchema = z.object({
  FK_articulo: z.number(),
  stock_total: z.number(),
});

export class StockConsolidadoResponseDto extends createZodDto(
  stockConsolidadoResponseSchema,
) {}
