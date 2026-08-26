import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * `indicador_entrada` se define únicamente en el alta: define si el tipo
 * suma (true) o resta (false) stock, y queda bloqueado para siempre
 * (ver UpdateTipoMovimientoDto).
 */
export const createTipoMovimientoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
  indicador_entrada: z.boolean(),
});

export class CreateTipoMovimientoDto extends createZodDto(
  createTipoMovimientoSchema,
) {}
