import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * `tasa_nominal_anual` viaja como `string` y no como `number`: la columna es
 * `Decimal(5, 2)` y Prisma la devuelve como `Prisma.Decimal`, que serializa a
 * string (mismo criterio que `precio` en `PlanPagoResponseDto`).
 */
export const plazoFinanciacionResponseSchema = z.object({
  id_plazo_financiacion: z.number(),
  codigo: z.string(),
  cantidad_cuotas: z.number(),
  tasa_nominal_anual: z.string(),
  descripcion: z.string().nullable(),
  estado: z.boolean(),
  // Prisma devuelve Date, pero sobre HTTP viaja como string ISO 8601.
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class PlazoFinanciacionResponseDto extends createZodDto(
  plazoFinanciacionResponseSchema,
) {}

/**
 * El listado agrega la tasa mensual (TNA ÷ 12), con cuatro decimales. Es un
 * dato derivado para mostrar: no se guarda, y el cálculo de cuotas parte de la
 * TNA, no de este valor redondeado.
 */
export const plazoFinanciacionListItemSchema = plazoFinanciacionResponseSchema
  .omit({
    hora_creacion: true,
    hora_actualizacion: true,
    FK_usuario_creador: true,
    FK_usuario_actualizador: true,
  })
  .extend({
    tasa_mensual: z.string(),
  });

export const plazoFinanciacionListResponseSchema = z.object({
  data: z.array(plazoFinanciacionListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class PlazoFinanciacionListResponseDto extends createZodDto(
  plazoFinanciacionListResponseSchema,
) {}

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Solo para el detalle (GET /plazos-financiacion/:id): además de los FK,
 * expone nombre y apellido de quién creó y de quién modificó por última vez el
 * plazo, que es lo que pide HU-32 para auditar altas, cambios de tasa y bajas.
 */
export const plazoFinanciacionDetalleResponseSchema =
  plazoFinanciacionResponseSchema.extend({
    tasa_mensual: z.string(),
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class PlazoFinanciacionDetalleResponseDto extends createZodDto(
  plazoFinanciacionDetalleResponseSchema,
) {}
