import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtro y paginación del margen por proyecto. El orden (del proyecto más
 * reciente al más antiguo, por fecha de inicio o, si no la tiene, por fecha
 * de alta) es fijo, no configurable por query param — mismo criterio que la
 * cuenta corriente de proveedores.
 *
 * `FK_proyecto` no valida que el proyecto exista ni que esté activo: si no
 * está entre los activos, la lista vuelve vacía (el margen es solo de
 * proyectos activos, así que un proyecto dado de baja no es un error).
 */
export const queryMargenProyectoSchema = z.object({
  FK_proyecto: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryMargenProyectoDto extends createZodDto(
  queryMargenProyectoSchema,
) {}
