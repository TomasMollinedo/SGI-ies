import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../common/validaciones/fecha-iso.schema';
import { OFFSET_ARGENTINA_ISO } from '../../../common/validaciones/offset-argentina';

export const AGRUPACION = ['MENSUAL', 'TRIMESTRAL', 'ANUAL'] as const;
export const agrupacionSchema = z.enum(AGRUPACION);
export type Agrupacion = (typeof AGRUPACION)[number];

/**
 * Igual que `fechaIsoSchema`, pero una fecha sola se ancla al FINAL del día
 * de Argentina y no a su medianoche: `fechaHasta=2026-12-31` tiene que
 * incluir lo cobrado o pagado durante todo el 31, no solo hasta las 00:00.
 * Con fecha y hora, se respeta lo que mande el cliente.
 */
const fechaHastaIsoSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform(
    (valor) =>
      new Date(
        valor.includes('T')
          ? valor
          : `${valor}T23:59:59.999${OFFSET_ARGENTINA_ISO}`,
      ),
  );

/**
 * Filtros del tablero: agrupación, rango de fechas y proyecto opcional.
 * `fechaDesde` y `fechaHasta` van juntas o ninguna: sin ellas el service usa
 * el año en curso. La agrupación por defecto es mensual.
 */
export const queryIngresosEgresosSchema = z
  .object({
    agrupacion: agrupacionSchema.default('MENSUAL'),
    fechaDesde: fechaIsoSchema.optional(),
    fechaHasta: fechaHastaIsoSchema.optional(),
    FK_proyecto: z.coerce.number().int().positive().optional(),
  })
  .refine(
    ({ fechaDesde, fechaHasta }) =>
      (fechaDesde === undefined) === (fechaHasta === undefined),
    { message: 'fechaDesde y fechaHasta se envían juntas o ninguna' },
  )
  .refine(
    ({ fechaDesde, fechaHasta }) =>
      fechaDesde === undefined ||
      fechaHasta === undefined ||
      fechaDesde <= fechaHasta,
    { message: 'fechaDesde no puede ser posterior a fechaHasta' },
  );

export class QueryIngresosEgresosDto extends createZodDto(
  queryIngresosEgresosSchema,
) {}
