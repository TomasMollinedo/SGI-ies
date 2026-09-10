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
  // Datos bancarios: null si nunca se cargaron, string vacío si se cargaron y
  // después se borraron desde la edición (mismo caso que domicilio o teléfono).
  banco: z.string().nullable().meta({
    description: 'Banco en el que el proveedor tiene la cuenta',
    example: 'Banco Macro',
  }),
  titular: z.string().nullable().meta({
    description: 'Titular de la cuenta bancaria, tal como figura en el banco',
    example: 'Farmacia Bermejo S.A.',
  }),
  cbu: z.string().nullable().meta({
    description: 'CBU de la cuenta: 22 dígitos, sin espacios ni guiones',
    example: '0170099220000067797151',
  }),
  alias: z.string().nullable().meta({
    description: 'Alias de la cuenta',
    example: 'mi.alias.banco',
  }),
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
