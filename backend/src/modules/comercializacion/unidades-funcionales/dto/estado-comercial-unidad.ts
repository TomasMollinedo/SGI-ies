import { z } from 'zod';
import { EstadoComercial } from '../../../../../generated/prisma/enums';

/**
 * Estado comercial de una unidad, tal como lo ve Proyectos en el listado.
 * Hereda los cuatro del enum de la publicación y suma `SIN_PUBLICAR`, que no
 * se persiste: es la unidad sin ninguna publicación vigente (nunca publicada o
 * despublicada).
 */
export const estadoComercialUnidadSchema = z.enum([
  'SIN_PUBLICAR',
  EstadoComercial.EN_PREPARACION,
  EstadoComercial.DISPONIBLE,
  EstadoComercial.EN_PLAN_DE_PAGO,
  EstadoComercial.VENDIDA,
]);

export type EstadoComercialUnidad = z.infer<typeof estadoComercialUnidadSchema>;
