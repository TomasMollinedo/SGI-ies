import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const categoriaResponseSchema = z.object({
  id_categoria: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class CategoriaResponseDto extends createZodDto(
  categoriaResponseSchema,
) {}

// El listado no expone quién ni cuándo se creó/modificó cada categoría —
// para eso está el detalle (GET /categorias/:id).
export const categoriaListItemSchema = categoriaResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const categoriaListResponseSchema = z.object({
  data: z.array(categoriaListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class CategoriaListResponseDto extends createZodDto(
  categoriaListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /categorias/:id): además de los FK, expone
 * nombre y apellido de quién creó y de quién modificó por última vez la
 * categoría. El listado general no trae esto (ver CategoriaListResponseDto).
 */
export const categoriaDetalleResponseSchema = categoriaResponseSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class CategoriaDetalleResponseDto extends createZodDto(
  categoriaDetalleResponseSchema,
) {}
