import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { agrupacionSchema } from './query-ingresos-egresos.dto';

const proyectoResumenSchema = z.object({
  id_proyecto: z.number(),
  nombre: z.string(),
});

/** Cobrado en un proyecto: la apertura de los ingresos. */
const ingresoPorProyectoSchema = z.object({
  proyecto: proyectoResumenSchema,
  total: z.number(),
});

/**
 * Un mes, trimestre o año del rango. Los períodos de los extremos pueden ser
 * parciales: `desde`/`hasta` ya vienen recortados al rango pedido.
 */
const periodoSchema = z.object({
  etiqueta: z.string().describe('Ej.: "2026-03", "2026-T1" o "2026"'),
  desde: z.iso.datetime(),
  hasta: z.iso.datetime(),
  ingresos: z.number(),
  egresos: z.number(),
  resultado: z
    .number()
    .nullable()
    .describe('Ingresos − egresos; null si se filtró por proyecto'),
  ingresosPorProyecto: z.array(ingresoPorProyectoSchema),
});

const totalesSchema = z.object({
  ingresos: z.number(),
  egresos: z.number(),
  resultado: z.number().nullable(),
  ingresosPorProyecto: z.array(ingresoPorProyectoSchema),
});

const rangoAnteriorSchema = z.object({
  desde: z.iso.datetime(),
  hasta: z.iso.datetime(),
  ingresos: z.number(),
  egresos: z.number(),
  resultado: z.number().nullable(),
});

/**
 * Variación porcentual contra el rango anterior. Es null cuando no se puede
 * calcular: el rango anterior estuvo en cero y el actual no (división por
 * cero), o el resultado no se devuelve por el filtro de proyecto.
 */
const variacionSchema = z.object({
  ingresos: z.number().nullable(),
  egresos: z.number().nullable(),
  resultado: z.number().nullable(),
});

export const ingresosEgresosResponseSchema = z.object({
  filtros: z.object({
    agrupacion: agrupacionSchema,
    fechaDesde: z.iso.datetime(),
    fechaHasta: z.iso.datetime(),
    FK_proyecto: z.number().nullable(),
  }),
  periodos: z.array(periodoSchema),
  totales: totalesSchema,
  rangoAnterior: rangoAnteriorSchema,
  variacion: variacionSchema,
});

export class IngresosEgresosResponseDto extends createZodDto(
  ingresosEgresosResponseSchema,
) {}
