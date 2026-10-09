import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const proyectoResumenSchema = z.object({
  id_proyecto: z.number(),
  codigo: z.string(),
  nombre: z.string(),
});

const margenSchema = z.object({
  importe: z.number(),
  porcentaje: z.number().meta({
    description:
      'Porcentaje del margen sobre las ventas: importe ÷ suma de los precios de las unidades que entraron en este margen (precio de venta en el realizado, precio de lista en el proyectado) × 100. No es sobre el costo. 0 si no entró ninguna unidad',
    example: 33.33,
  }),
});

const margenProyectoItemSchema = z.object({
  proyecto: proyectoResumenSchema,
  unidades_activas: z.number(),
  /** Con venta vigente. */
  unidades_vendidas: z.number(),
  /** `unidades_vendidas / unidades_activas * 100`. 0 si no hay unidades activas. */
  porcentaje_vendidas: z.number(),
  /** Activas sin publicación vigente, o publicadas En preparación (sin precio de lista). */
  unidades_fuera_de_calculo: z.number(),
  margen_realizado: margenSchema,
  margen_proyectado: margenSchema,
  /** `margen_realizado.importe + margen_proyectado.importe`. */
  margen_total_esperado: z.number(),
});

export const margenProyectoResponseSchema = z.object({
  /** La página pedida, del proyecto más reciente al más antiguo: por `fecha_inicio` o, si es `null`, por fecha de alta (a igual fecha, por nombre). */
  data: z.array(margenProyectoItemSchema),
  /** De TODOS los proyectos (activos e inactivos): el margen ya realizado no deja de contar porque el proyecto se dé de baja después. No lo afectan `FK_proyecto` ni la paginación. */
  margen_total_realizado: z.number(),
  /** Suma de `unidades_fuera_de_calculo` de todas las filas que matchean `FK_proyecto`, no solo las de la página. */
  total_unidades_fuera_de_calculo: z.number(),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class MargenProyectoResponseDto extends createZodDto(
  margenProyectoResponseSchema,
) {}
