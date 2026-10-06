import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoProyecto } from '../../../../generated/prisma/enums';

/**
 * Avance del estado de obra. Fija solo los DESTINOS posibles: En
 * planificación es el estado inicial y Cancelado no es alcanzable desde acá,
 * así que ninguno de los dos se acepta (400). Qué transición es válida desde
 * el estado actual es lógica del service.
 */
export const cambiarEstadoObraSchema = z.object({
  estado_obra: z.enum([EstadoProyecto.EN_EJECUCION, EstadoProyecto.FINALIZADO]),
});

export class CambiarEstadoObraDto extends createZodDto(
  cambiarEstadoObraSchema,
) {}
