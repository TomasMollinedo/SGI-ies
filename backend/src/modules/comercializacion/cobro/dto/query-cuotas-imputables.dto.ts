import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtro del endpoint que alimenta el formulario de cobro: el cliente es
 * obligatorio y es el único filtro — no pagina, el formulario necesita ver
 * todas las cuotas imputables de una vez para que el usuario decida cuáles
 * marcar. Mismo criterio que `QueryComprobantesImputablesDto` de Pagos.
 */
export const queryCuotasImputablesSchema = z.object({
  FK_cliente: z.coerce.number().int().positive(),
});

export class QueryCuotasImputablesDto extends createZodDto(
  queryCuotasImputablesSchema,
) {}
