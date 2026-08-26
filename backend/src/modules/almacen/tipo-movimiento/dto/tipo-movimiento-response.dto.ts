import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const tipoMovimientoResponseSchema = z.object({
  // El "código único generado por el sistema" que pide la HU es este id.
  id_tipo_movimiento: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  indicador_entrada: z.boolean(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class TipoMovimientoResponseDto extends createZodDto(
  tipoMovimientoResponseSchema,
) {}

// El listado no expone quién ni cuándo se creó/modificó cada tipo —
// para eso está el detalle (GET /tipos-movimiento/:id).
export const tipoMovimientoListItemSchema = tipoMovimientoResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const tipoMovimientoListResponseSchema = z.object({
  data: z.array(tipoMovimientoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class TipoMovimientoListResponseDto extends createZodDto(
  tipoMovimientoListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /tipos-movimiento/:id): además de los FK,
 * expone nombre y apellido de quién creó y de quién modificó por última vez
 * el tipo de movimiento. El listado general no trae esto.
 */
export const tipoMovimientoDetalleResponseSchema =
  tipoMovimientoResponseSchema.extend({
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class TipoMovimientoDetalleResponseDto extends createZodDto(
  tipoMovimientoDetalleResponseSchema,
) {}
