import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CondicionIVA } from '../../../../../generated/prisma/enums';

export const proveedorResponseSchema = z.object({
  id_proveedor: z.number(),
  razon_social: z.string(),
  cuit: z.string(),
  condicion_iva: z.enum(CondicionIVA),
  domicilio: z.string().nullable(),
  telefono: z.string().nullable(),
  correo: z.string().nullable(),
  observaciones: z.string().nullable(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601 —
  // el DTO de respuesta documenta lo que realmente recibe el frontend.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class ProveedorResponseDto extends createZodDto(
  proveedorResponseSchema,
) {}

// El listado no expone quién ni cuándo se creó/modificó cada proveedor —
// para eso está el detalle (GET /proveedores/:id).
export const proveedorListItemSchema = proveedorResponseSchema.omit({
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
});

export const proveedorListResponseSchema = z.object({
  data: z.array(proveedorListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ProveedorListResponseDto extends createZodDto(
  proveedorListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /proveedores/:id): además de los FK, expone
 * nombre y apellido de quién creó y de quién modificó por última vez el
 * proveedor. El listado general no trae esto (ver ProveedorListResponseDto).
 */
export const proveedorDetalleResponseSchema = proveedorResponseSchema.extend({
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class ProveedorDetalleResponseDto extends createZodDto(
  proveedorDetalleResponseSchema,
) {}
