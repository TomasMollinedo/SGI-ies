import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * `aumenta_saldo` y `requiere_comprobante_origen` se definen únicamente en el
 * alta: fijan cómo impacta este tipo de comprobante en la cuenta corriente
 * del proveedor, y quedan bloqueados para siempre (ver UpdateTipoComprobanteDto).
 */
export const createTipoComprobanteSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
  aumenta_saldo: z.boolean(),
  requiere_comprobante_origen: z.boolean(),
});

export class CreateTipoComprobanteDto extends createZodDto(
  createTipoComprobanteSchema,
) {}
