import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const unidadMedidaResponseSchema = z.object({
  id_unidad_medida: z.number(),
  nombre: z.string(),
  abreviatura: z.string(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class UnidadMedidaResponseDto extends createZodDto(
  unidadMedidaResponseSchema,
) {}

// El listado no expone quién ni cuándo se creó/modificó cada unidad —
// para eso está el detalle (GET /unidades-medida/:id).
export const unidadMedidaListItemSchema = unidadMedidaResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const unidadMedidaListResponseSchema = z.object({
  data: z.array(unidadMedidaListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class UnidadMedidaListResponseDto extends createZodDto(
  unidadMedidaListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /unidades-medida/:id): además de los FK, expone
 * nombre y apellido de quién creó y de quién modificó por última vez la
 * unidad. El listado general no trae esto (ver UnidadMedidaListResponseDto).
 */
export const unidadMedidaDetalleResponseSchema =
  unidadMedidaResponseSchema.extend({
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class UnidadMedidaDetalleResponseDto extends createZodDto(
  unidadMedidaDetalleResponseSchema,
) {}
