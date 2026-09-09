import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * A propósito NO se arma como `.partial()` del schema de create: el schema se declara solo con los campos realmente editables, para que
 * `aumenta_saldo` ni siquiera sea representable en el body.
 *
 * El motivo es que ese indicador define cómo cada comprobante ya registrado
 * con este tipo impactó (o va a impactar) la cuenta corriente del proveedor.
 * Si se pudiera editar, cambiaría retroactivamente la interpretación de todos
 * los comprobantes históricos que usaron este tipo. El bloqueo es permanente y
 * no depende del valor: ni de `true` a `false` ni al revés.
 *
 * El `estado` tampoco se toca acá: va por PATCH /:id/baja y /:id/alta.
 */
export const updateTipoComprobanteSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
    descripcion: z.string().trim().max(255),
  })
  .partial();

export class UpdateTipoComprobanteDto extends createZodDto(
  updateTipoComprobanteSchema,
) {}
