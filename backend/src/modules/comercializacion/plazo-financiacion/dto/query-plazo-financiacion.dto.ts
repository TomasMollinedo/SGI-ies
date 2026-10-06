import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtros de listado: solo por estado. HU-32 pide que el listado muestre por
 * defecto los plazos activos, así que `estado` lleva `.default(true)` (mismo
 * criterio que Formas de Pago). `estado=todos` trae activos e inactivos, para
 * poder encontrar un plazo dado de baja y reactivarlo.
 *
 * `estado` entra como `'true'`/`'false'` y no como boolean porque los query
 * params llegan siempre string. El `.default(true)` va con el valor de salida
 * (boolean) y no con el de entrada: en Zod 4 `.default()` es posterior al
 * `.transform()`.
 */
export const queryPlazoFinanciacionSchema = z.object({
  estado: z
    .enum(['true', 'false', 'todos'])
    .transform((valor) => (valor === 'todos' ? valor : valor === 'true'))
    .default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryPlazoFinanciacionDto extends createZodDto(
  queryPlazoFinanciacionSchema,
) {}
