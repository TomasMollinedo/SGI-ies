import { createZodDto } from 'nestjs-zod';
import { createPlanEjemploSchema } from './create-plan-ejemplo.dto';

/**
 * Simulación de un plan de ejemplo mientras se arma (HU-22): las mismas
 * condiciones que el alta, sin el nombre. El precio de lista y la TNA no
 * viajan: se leen de la base, así la simulación muestra exactamente lo que
 * va a mostrar el plan una vez guardado.
 */
export const simularPlanEjemploSchema = createPlanEjemploSchema.pick({
  FK_publicacion: true,
  anticipo_porcentaje: true,
  FK_plazo_financiacion: true,
});

export class SimularPlanEjemploDto extends createZodDto(
  simularPlanEjemploSchema,
) {}
