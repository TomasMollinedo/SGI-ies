import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Paginación del historial de pagos de una unidad propia (T112, HU-28): mismo
 * criterio que `queryMisConsultasSchema` — puede crecer con el tiempo (cada
 * cuota puede recibir más de un pago parcial), default 10 como el resto de
 * las paginaciones del proyecto.
 */
export const queryHistorialPagosClienteSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryHistorialPagosClienteDto extends createZodDto(
  queryHistorialPagosClienteSchema,
) {}
