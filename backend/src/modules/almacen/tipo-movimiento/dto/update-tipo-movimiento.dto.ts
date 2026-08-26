import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * A propósito NO se arma como `.partial()` del schema de create: el schema
 * se declara solo con los campos realmente editables, para que
 * `indicador_entrada` ni siquiera sea representable en el body.
 *
 * El motivo es que `STOCKMOVIMIENTO.cantidad` no lleva signo: el signo lo
 * aporta el `indicador_entrada` del tipo usado en cada movimiento. Si se
 * pudiera editar, cambiaría retroactivamente el efecto de todos los
 * movimientos históricos que ya usaron ese tipo.
 *
 * El `estado` tampoco se toca acá: va por PATCH /:id/baja y /:id/alta.
 */
export const updateTipoMovimientoSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
    descripcion: z.string().trim().max(255),
  })
  .partial();

export class UpdateTipoMovimientoDto extends createZodDto(
  updateTipoMovimientoSchema,
) {}
