import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const marcaResponseSchema = z.object({
  id_marca: z.number(),
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

export class MarcaResponseDto extends createZodDto(marcaResponseSchema) {}

// El listado no expone quién ni cuándo se creó/modificó cada marca —
// para eso está el detalle (GET /marcas/:id).
export const marcaListItemSchema = marcaResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const marcaListResponseSchema = z.object({
  data: z.array(marcaListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class MarcaListResponseDto extends createZodDto(
  marcaListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /marcas/:id): además de los FK, expone
 * nombre y apellido de quién creó y de quién modificó por última vez la
 * marca. El listado general no trae esto (ver MarcaListResponseDto).
 */
export const marcaDetalleResponseSchema = marcaResponseSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class MarcaDetalleResponseDto extends createZodDto(
  marcaDetalleResponseSchema,
) {}
