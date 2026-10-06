import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { clienteResumenSchema } from './venta-response.dto';

/** Respuesta de GET /ventas/buscar-clientes: listado paginado, mismo shape que el resto de los listados. */
export const clienteBusquedaResponseSchema = z.object({
  data: z.array(clienteResumenSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ClienteBusquedaResponseDto extends createZodDto(
  clienteBusquedaResponseSchema,
) {}
