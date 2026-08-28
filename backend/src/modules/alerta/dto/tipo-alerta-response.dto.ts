import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Tipo de alerta que puede generar el sistema. Es una tabla de referencia
 * sembrada por código (igual que ROL), no tiene ABM: este DTO solo se usa para
 * poblar el filtro por tipo en el frontend.
 */
export const tipoAlertaResponseSchema = z.object({
  id_tipo_alerta: z.number(),
  // Identificador estable que usa el código (ej. "REPOSICION").
  nombre: z.string(),
  descripcion: z.string().nullable(),
});

export class TipoAlertaResponseDto extends createZodDto(
  tipoAlertaResponseSchema,
) {}
