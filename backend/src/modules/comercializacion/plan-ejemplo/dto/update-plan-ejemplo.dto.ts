import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  anticipoPorcentajeSchema,
  idPlazoFinanciacionSchema,
} from './create-plan-ejemplo.dto';

/**
 * Edición de un plan de ejemplo (HU-22): nombre, anticipo, plazo y estado
 * (activo / inactivo). A diferencia de los planes del Sprint 3, el anticipo y
 * el plazo sí se editan: el plan es solo informativo, ninguna venta queda
 * atada a sus condiciones.
 *
 * `FK_publicacion` no figura: un plan no se mueve de publicación. Si llega,
 * se descarta como cualquier clave de más.
 */
export const updatePlanEjemploSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'El nombre del plan es obligatorio')
      .max(100),
    anticipo_porcentaje: anticipoPorcentajeSchema,
    FK_plazo_financiacion: idPlazoFinanciacionSchema,
    estado: z.boolean(),
  })
  .partial();

export class UpdatePlanEjemploDto extends createZodDto(
  updatePlanEjemploSchema,
) {}
