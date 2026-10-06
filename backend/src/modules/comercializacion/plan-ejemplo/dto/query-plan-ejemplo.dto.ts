import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Los planes de ejemplo de una publicación. Sin paginación: son pocos por
 * diseño. `estado` filtra por activo / inactivo (default: solo activos);
 * `todos` trae ambos, que es como la pantalla encuentra uno inactivo para
 * reactivarlo.
 */
export const queryPlanEjemploSchema = z.object({
  FK_publicacion: z.coerce.number().int().positive(),
  estado: z
    .enum(['true', 'false', 'todos'])
    .transform((valor) => (valor === 'todos' ? valor : valor === 'true'))
    .default(true),
});

export class QueryPlanEjemploDto extends createZodDto(queryPlanEjemploSchema) {}
