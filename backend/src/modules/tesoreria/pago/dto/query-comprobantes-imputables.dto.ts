import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtro del endpoint que alimenta el formulario de emisión (T86): el
 * proveedor es obligatorio y es el único filtro — no pagina, porque el
 * formulario necesita ver todos los comprobantes imputables de una vez para
 * que el usuario decida cuáles marcar.
 */
export const queryComprobantesImputablesSchema = z.object({
  FK_proveedor: z.coerce.number().int().positive(),
});

export class QueryComprobantesImputablesDto extends createZodDto(
  queryComprobantesImputablesSchema,
) {}
