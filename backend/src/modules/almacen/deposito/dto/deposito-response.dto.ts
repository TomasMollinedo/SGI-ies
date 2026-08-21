import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const depositoResponseSchema = z.object({
  id_deposito: z.number(),
  nombre: z.string(),
  es_obrador: z.boolean(),
  ubicacion: z.string().nullable(),
  descripcion: z.string().nullable(),
  estado: z.boolean(),
  FK_Proyecto: z.number().nullable(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class DepositoResponseDto extends createZodDto(depositoResponseSchema) {}

// El listado no expone quién ni cuándo se creó/modificó cada depósito —
// para eso está el detalle (GET /depositos/:id).
export const depositoListItemSchema = depositoResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const depositoListResponseSchema = z.object({
  data: z.array(depositoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class DepositoListResponseDto extends createZodDto(
  depositoListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /depositos/:id): además de los FK, expone
 * nombre y apellido de quién creó y de quién modificó por última vez el
 * depósito/obrador. El listado general no trae esto (ver
 * DepositoListResponseDto).
 */
export const depositoDetalleResponseSchema = depositoResponseSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class DepositoDetalleResponseDto extends createZodDto(
  depositoDetalleResponseSchema,
) {}
