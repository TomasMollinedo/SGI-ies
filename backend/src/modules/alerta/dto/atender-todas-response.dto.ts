import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Resultado de marcar como atendidas todas las alertas pendientes del usuario.
 *
 * No devuelve las alertas afectadas: pueden ser muchas y el frontend refresca
 * el listado de todos modos. El contador alcanza para el mensaje de
 * confirmación ("Se marcaron N alertas como leídas").
 */
export const atenderTodasResponseSchema = z.object({
  atendidas: z.number(),
});

export class AtenderTodasResponseDto extends createZodDto(
  atenderTodasResponseSchema,
) {}
