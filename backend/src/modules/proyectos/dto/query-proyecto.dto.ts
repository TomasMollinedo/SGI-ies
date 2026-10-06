import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoProyecto } from '../../../../generated/prisma/enums';

/**
 * Filtros del listado, combinables entre sí.
 *
 * `estado` es la baja lógica, igual que en Proveedor: sin este filtro se
 * listan solo los proyectos activos, y `estado=todos` trae activos y dados
 * de baja. El estado de avance de la obra se filtra aparte, con `estado_obra`.
 */
export const queryProyectoSchema = z.object({
  busqueda: z.string().trim().min(1).optional(),
  estado: z
    .enum(['true', 'false', 'todos'])
    .transform((valor) => (valor === 'todos' ? valor : valor === 'true'))
    .optional(),
  estado_obra: z.enum(EstadoProyecto).optional(),
  localidad: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryProyectoDto extends createZodDto(queryProyectoSchema) {}
