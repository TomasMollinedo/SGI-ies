import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Máximo de cuotas que admite un plazo. El 60 sale del caso de prueba del
 * sistema francés (docs/cambios_der_sprint_4.md) y sigue pendiente de
 * confirmar con el equipo (OBS-13): si cambia, se cambia solo acá.
 */
export const MAX_CANTIDAD_CUOTAS = 60;

/**
 * Campos compartidos entre alta y edición: la TNA y la descripción. Los
 * límites de la TNA salen de la columna `Decimal(5, 2)` — hasta 999,99 con dos
 * decimales — y de la HU: mayor o igual a cero (0 % es válido, ver HU-27).
 *
 * La TNA viaja como `number` (es lo que hay en JSON); el service la pasa a
 * `Prisma.Decimal` antes de guardarla.
 */
export const camposPlazoFinanciacion = {
  tasa_nominal_anual: z
    .number()
    .min(0, 'La TNA no puede ser negativa')
    .max(999.99, 'La TNA no puede superar 999,99')
    .multipleOf(0.01, 'La TNA admite hasta dos decimales'),
  descripcion: z.string().trim().max(255),
};

/**
 * `cantidad_cuotas` se define únicamente en el alta: queda bloqueada para
 * siempre (ver UpdatePlazoFinanciacionDto), porque los planes de pago y de
 * ejemplo ya cargados se identifican con ella.
 *
 * El código lo genera el sistema, así que no se acepta en el body. Tampoco
 * `estado` (el plazo nace activo por el `@default(true)` del modelo) ni los
 * campos de auditoría, que salen del usuario autenticado.
 *
 * La unicidad de `cantidad_cuotas` entre plazos activos necesita ir a la base,
 * así que la valida el service.
 */
export const createPlazoFinanciacionSchema = z.object({
  cantidad_cuotas: z
    .number()
    .int('La cantidad de cuotas debe ser un número entero')
    .min(1, 'La cantidad de cuotas debe ser mayor a cero')
    .max(
      MAX_CANTIDAD_CUOTAS,
      `La cantidad de cuotas no puede superar ${MAX_CANTIDAD_CUOTAS}`,
    ),
  tasa_nominal_anual: camposPlazoFinanciacion.tasa_nominal_anual,
  descripcion: camposPlazoFinanciacion.descripcion.optional(),
});

export class CreatePlazoFinanciacionDto extends createZodDto(
  createPlazoFinanciacionSchema,
) {}
