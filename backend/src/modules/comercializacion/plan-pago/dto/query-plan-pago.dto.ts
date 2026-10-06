import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtros del listado de planes de una publicación.
 *
 * `FK_publicacion` es obligatorio: no existe un listado global de planes, un
 * plan solo tiene sentido colgado de su publicación.
 *
 * `estado` replica el patrón de `QueryFormaPagoDto`/`QueryProveedorDto`:
 * llega como string (los query params siempre son string), el default es
 * `true` para que el listado muestre solo los planes activos, `false` trae
 * los inactivos y `todos` trae ambos — que es lo que necesita la pantalla
 * para encontrar un plan inactivo y reactivarlo.
 *
 * Sin paginación a propósito: los planes de una publicación son pocos por
 * diseño (es un abanico de opciones de pago, no un listado que crezca sin
 * límite), mismo criterio que los catálogos.
 */
export const queryPlanPagoSchema = z.object({
  FK_publicacion: z.coerce.number().int().positive(),
  estado: z
    .enum(['true', 'false', 'todos'])
    .transform((valor) => (valor === 'todos' ? valor : valor === 'true'))
    .default(true),
});

export class QueryPlanPagoDto extends createZodDto(queryPlanPagoSchema) {}
