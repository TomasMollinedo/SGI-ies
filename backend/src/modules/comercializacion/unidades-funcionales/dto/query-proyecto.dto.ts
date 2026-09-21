import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoProyecto } from '../../../../../generated/prisma/enums';

export const queryProyectoSchema = z.object({
  busqueda: z.string().trim().min(1).optional(),
  estado: z.enum(EstadoProyecto).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryProyectoDto extends createZodDto(queryProyectoSchema) {}
