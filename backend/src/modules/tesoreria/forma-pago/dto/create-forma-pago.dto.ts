import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * `requiere_referencia` se define únicamente en el alta: indica si la forma
 * de pago exige cargar un número de referencia (nro. de operación de una
 * transferencia, nro. de cheque) y queda bloqueado para siempre
 * (ver UpdateFormaPagoDto).
 *
 * El código único de la forma de pago lo genera el sistema: es la PK
 * autoincremental `id_forma_pago`, así que no se acepta en el body.
 *
 * El `estado` tampoco viaja acá: la forma de pago nace activa por el
 * `@default(true)` de FORMAPAGO, y se da de baja o de alta por sus endpoints
 * dedicados, igual que en el resto de los ABM.
 *
 * El `.trim()` del nombre es la única normalización que hace el schema. La
 * unicidad del nombre entre formas de pago activas necesita ir a la base, así
 * que la valida el service (FORMAPAGO no tiene `nombre` unique a propósito).
 */
export const createFormaPagoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
  requiere_referencia: z.boolean(),
});

export class CreateFormaPagoDto extends createZodDto(createFormaPagoSchema) {}
