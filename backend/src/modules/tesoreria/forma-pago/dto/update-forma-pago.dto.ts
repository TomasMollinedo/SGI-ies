import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * A propósito NO se arma como `.partial()` del schema de create: el schema se
 * declara solo con los campos realmente editables, para que
 * `requiere_referencia` ni siquiera sea representable en el body.
 *
 * El motivo es el mismo que en `TIPOMOVIMIENTO.indicador_entrada`:
 * `ORDENPAGO.numero_referencia` es nullable y su obligatoriedad la resuelve el
 * service mirando la forma de pago usada. Si `requiere_referencia` se pudiera
 * editar, todas las órdenes de pago históricas cargadas sin referencia
 * quedarían incumpliendo la regla que su forma de pago pasa a exigir.
 *
 * El `estado` tampoco se toca acá: va por PATCH /:id/baja y /:id/alta.
 */
export const updateFormaPagoSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
    descripcion: z.string().trim().max(255),
  })
  .partial();

export class UpdateFormaPagoDto extends createZodDto(updateFormaPagoSchema) {}
