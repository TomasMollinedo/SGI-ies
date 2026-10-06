import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * HU-29: el cliente declara un pago propio sobre una cuota propia. No manda
 * `FK_cliente` (sale de `@CurrentCliente()`, nunca del body — mismo criterio
 * de auditoría que el resto del proyecto) ni `estado` (nace PENDIENTE por el
 * `@default` del schema). El resto de las reglas (la cuota es propia y está
 * declarable, la forma de pago sigue habilitada, el importe no supera el
 * saldo pendiente) dependen de consultas a la base y las valida el service.
 */
export const createDeclaracionPagoSchema = z.object({
  FK_cuota: z.number().int().positive(),
  FK_forma_pago: z.number().int().positive(),
  importe: z
    .number()
    .positive('El importe debe ser mayor a 0')
    .multipleOf(0.01, 'El importe admite hasta dos decimales'),
  numero_referencia: z.string().trim().max(100).optional(),
});

export class CreateDeclaracionPagoDto extends createZodDto(
  createDeclaracionPagoSchema,
) {}
