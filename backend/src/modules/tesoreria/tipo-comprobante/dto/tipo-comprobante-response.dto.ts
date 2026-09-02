import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const tipoComprobanteResponseSchema = z.object({
  // El "código único generado por el sistema" que pide la HU es este id.
  id_tipo_comprobante: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  aumenta_saldo: z.boolean(),
  requiere_comprobante_origen: z.boolean(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class TipoComprobanteResponseDto extends createZodDto(
  tipoComprobanteResponseSchema,
) {}

// El listado no expone quién ni cuándo se creó/modificó cada tipo —
// para eso está el detalle (GET /tipos-comprobante/:id).
export const tipoComprobanteListItemSchema = tipoComprobanteResponseSchema.omit(
  {
    hora_creacion: true,
    hora_actualizacion: true,
    FK_usuario_creador: true,
    FK_usuario_actualizador: true,
  },
);

export const tipoComprobanteListResponseSchema = z.object({
  data: z.array(tipoComprobanteListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class TipoComprobanteListResponseDto extends createZodDto(
  tipoComprobanteListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /tipos-comprobante/:id): además de los FK,
 * expone nombre y apellido de quién creó y de quién modificó por última vez
 * el tipo de comprobante. El listado general no trae esto.
 */
export const tipoComprobanteDetalleResponseSchema =
  tipoComprobanteResponseSchema.extend({
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class TipoComprobanteDetalleResponseDto extends createZodDto(
  tipoComprobanteDetalleResponseSchema,
) {}
