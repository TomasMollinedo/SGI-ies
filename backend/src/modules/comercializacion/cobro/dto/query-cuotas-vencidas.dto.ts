import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Los dos filtros combinables que pide el ticket. Ninguno es obligatorio:
 * sin filtros, trae las cuotas vencidas de todo el sistema. Sin paginar,
 * mismo criterio que las cuotas imputables — es una lista de seguimiento,
 * no un listado masivo con scroll infinito.
 */
export const queryCuotasVencidasSchema = z.object({
  FK_cliente: z.coerce.number().int().positive().optional(),
  FK_proyecto: z.coerce.number().int().positive().optional(),
});

export class QueryCuotasVencidasDto extends createZodDto(
  queryCuotasVencidasSchema,
) {}
