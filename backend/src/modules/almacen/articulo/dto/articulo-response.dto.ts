import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const articuloResponseSchema = z.object({
  id_articulo: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  estado: z.boolean(),
  FK_Categoria: z.number(),
  FK_Marca: z.number().nullable(),
  FK_UnidadMedida: z.number(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class ArticuloResponseDto extends createZodDto(
  articuloResponseSchema,
) {}

const categoriaResumenSchema = z.object({
  id_categoria: z.number(),
  nombre: z.string(),
});

const marcaResumenSchema = z.object({
  id_marca: z.number(),
  nombre: z.string(),
});

const unidadMedidaResumenSchema = z.object({
  id_unidad_medida: z.number(),
  nombre: z.string(),
  abreviatura: z.string(),
});

export const articuloListItemSchema = articuloResponseSchema
  .omit({
    hora_creacion: true,
    hora_actualizacion: true,
    FK_usuario_creador: true,
    FK_usuario_actualizador: true,
  })
  .extend({
    categoria: categoriaResumenSchema,
    marca: marcaResumenSchema.nullable(),
    unidadMedida: unidadMedidaResumenSchema,
  });

export const articuloListResponseSchema = z.object({
  data: z.array(articuloListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ArticuloListResponseDto extends createZodDto(
  articuloListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

export const articuloDetalleResponseSchema = articuloResponseSchema.extend({
  categoria: categoriaResumenSchema,
  marca: marcaResumenSchema.nullable(),
  unidadMedida: unidadMedidaResumenSchema,
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class ArticuloDetalleResponseDto extends createZodDto(
  articuloDetalleResponseSchema,
) {}