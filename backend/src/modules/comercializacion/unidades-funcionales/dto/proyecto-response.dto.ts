import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoProyecto } from '../../../../../generated/prisma/enums';

export const proyectoResponseSchema = z.object({
  id_proyecto: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  localidad: z.string(),
  direccion: z.string().nullable(),
  estado: z.enum(EstadoProyecto),
  fecha_fin_estimada: z.iso.datetime().nullable(),
  cantidad_unidades_planificadas: z.number().nullable(),
  unidades_cargadas: z.number().meta({
    description: 'Cantidad de unidades activas cargadas en el proyecto',
  }),
  presupuesto: z.number().meta({
    description:
      'Suma del costo de las unidades activas, en pesos. Se calcula, no se carga ni se edita.',
  }),
});

export class ProyectoResponseDto extends createZodDto(proyectoResponseSchema) {}

export const proyectoListResponseSchema = z.object({
  data: z.array(proyectoResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ProyectoListResponseDto extends createZodDto(
  proyectoListResponseSchema,
) {}
