import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Las condiciones que definen un plan de ejemplo (HU-22): el anticipo en
 * porcentaje del precio de lista y el plazo de financiación. Compartidas por
 * el alta, la edición y la simulación, para que las tres validen igual.
 *
 * Las cuotas son siempre mensuales y su cantidad la da el plazo; el pago de
 * contado no se carga como plan (es el precio de lista).
 */
export const anticipoPorcentajeSchema = z
  .number()
  .gt(0, 'El anticipo debe ser mayor a 0 %')
  .lt(100, 'El anticipo debe ser menor a 100 %')
  .multipleOf(0.01, 'El anticipo admite hasta dos decimales');

export const idPlazoFinanciacionSchema = z.number().int().positive();

/**
 * Alta de un plan de ejemplo. Los importes (anticipo en pesos, cuota,
 * intereses, total) no viajan ni se guardan: se calculan cada vez que el plan
 * se muestra, con el precio de lista y la TNA vigentes.
 *
 * Sin `estado` (el plan nace activo por el `@default(true)` de PLANEJEMPLO)
 * ni campos de auditoría, que salen del usuario autenticado.
 */
export const createPlanEjemploSchema = z.object({
  FK_publicacion: z.number().int().positive(),
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre del plan es obligatorio')
    .max(100),
  anticipo_porcentaje: anticipoPorcentajeSchema,
  FK_plazo_financiacion: idPlazoFinanciacionSchema,
});

export class CreatePlanEjemploDto extends createZodDto(
  createPlanEjemploSchema,
) {}
