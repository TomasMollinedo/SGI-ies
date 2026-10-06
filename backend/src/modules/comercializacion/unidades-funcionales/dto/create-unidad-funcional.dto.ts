import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipologiaUnidad } from '../../../../../generated/prisma/enums';

// Topes de las columnas Decimal(10,2) y Decimal(14,2): sin ellos, un número
// más grande llega a Postgres y vuelve como un 500 en vez de un 400.
const MAX_SUPERFICIE = 99_999_999.99;
const MAX_COSTO = 999_999_999_999.99;

/**
 * Alta de una unidad funcional. El sistema opera en una única moneda (pesos):
 * no hay campo de moneda. Tampoco hay `presupuesto` ni datos de auditoría —
 * `FK_usuario_*` y las horas las completa el servidor; Zod descarta cualquier
 * clave que llegue en el body y no esté declarada acá.
 */
export const createUnidadFuncionalSchema = z.object({
  FK_proyecto: z.number().int().positive().meta({
    description: 'id_proyecto del proyecto al que pertenece la unidad',
  }),
  identificador: z
    .string()
    .trim()
    .min(1, 'El identificador es obligatorio')
    .max(30)
    .meta({
      description:
        'Identificador de la unidad, único entre las unidades activas del mismo proyecto',
      example: '3A',
    }),
  tipologia: z.enum(TipologiaUnidad),
  superficie_cubierta: z
    .number()
    .positive('La superficie cubierta debe ser mayor a cero')
    .multipleOf(0.01, 'La superficie cubierta admite hasta dos decimales')
    .max(MAX_SUPERFICIE),
  costo: z
    .number()
    .positive('El costo debe ser mayor a cero')
    .multipleOf(0.01, 'El costo admite hasta dos decimales')
    .max(MAX_COSTO)
    .meta({
      description:
        'Costo en pesos, definido en la planificación de obra. Solo editable mientras la unidad no tenga ninguna publicación (ni siquiera "en preparación").',
    }),
  piso: z.string().trim().max(20).optional().meta({
    description: 'Texto y no número, porque existe "PB"',
    example: 'PB',
  }),
  // null borra el valor en la edición.
  superficie_descubierta: z
    .number()
    .nonnegative()
    .multipleOf(0.01, 'La superficie descubierta admite hasta dos decimales')
    .max(MAX_SUPERFICIE)
    .nullable()
    .optional(),
  comodidades: z.string().trim().max(500).optional(),
  observaciones: z.string().trim().max(500).optional(),
});

export class CreateUnidadFuncionalDto extends createZodDto(
  createUnidadFuncionalSchema,
) {}
