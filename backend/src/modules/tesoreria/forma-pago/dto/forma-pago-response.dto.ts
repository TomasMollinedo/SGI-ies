import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const formaPagoResponseSchema = z.object({
  // El "código único generado por el sistema" que pide la HU es este id.
  id_forma_pago: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  requiere_referencia: z.boolean(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class FormaPagoResponseDto extends createZodDto(
  formaPagoResponseSchema,
) {}

// El listado no expone quién ni cuándo se creó/modificó cada forma de pago —
// para eso está el detalle (GET /formas-pago/:id).
export const formaPagoListItemSchema = formaPagoResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const formaPagoListResponseSchema = z.object({
  data: z.array(formaPagoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class FormaPagoListResponseDto extends createZodDto(
  formaPagoListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /formas-pago/:id): además de los FK, expone
 * nombre y apellido de quién creó y de quién modificó por última vez la
 * forma de pago. El listado general no trae esto.
 */
export const formaPagoDetalleResponseSchema = formaPagoResponseSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class FormaPagoDetalleResponseDto extends createZodDto(
  formaPagoDetalleResponseSchema,
) {}
