import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * `aumenta_saldo` se define únicamente en el alta: fija cómo impacta este tipo
 * de comprobante en la cuenta corriente del proveedor, y queda bloqueado para
 * siempre, cualquiera sea su valor (ver UpdateTipoComprobanteDto).
 */
export const createTipoComprobanteSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
  aumenta_saldo: z.boolean(),
});

export class CreateTipoComprobanteDto extends createZodDto(
  createTipoComprobanteSchema,
) {}
