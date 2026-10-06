import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { camposPlazoFinanciacion } from './create-plazo-financiacion.dto';

/**
 * A propósito NO se arma como `.partial()` del schema de create: se declara
 * solo con los campos realmente editables, para que `cantidad_cuotas` ni
 * siquiera sea representable en el body (HU-32: queda bloqueada desde el
 * alta). Si el cliente la manda igual, Zod la descarta.
 *
 * Cambiar la TNA no toca los planes de pago ya confirmados: copian y congelan
 * la tasa al crearse. Sí cambia lo que muestran los planes de ejemplo, que
 * leen la tasa vigente.
 *
 * El `estado` tampoco se toca acá: va por PATCH /:id/baja y /:id/alta.
 */
export const updatePlazoFinanciacionSchema = z
  .object({
    tasa_nominal_anual: camposPlazoFinanciacion.tasa_nominal_anual,
    descripcion: camposPlazoFinanciacion.descripcion,
  })
  .partial();

export class UpdatePlazoFinanciacionDto extends createZodDto(
  updatePlazoFinanciacionSchema,
) {}
