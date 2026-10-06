import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Paginación de las declaraciones de pago de una unidad propia (T117, HU-29):
 * mismo criterio que `queryHistorialPagosClienteSchema` — puede crecer con el
 * tiempo (cada cuota admite volver a declarar después de un rechazo), default
 * 10 como el resto de las paginaciones del proyecto.
 */
export const queryDeclaracionesPagoClienteSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryDeclaracionesPagoClienteDto extends createZodDto(
  queryDeclaracionesPagoClienteSchema,
) {}
