import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipologiaUnidad } from '../../../../generated/prisma/enums';

/**
 * Filtros combinables del listado. El rango de superficie es sobre la
 * superficie cubierta, con mínimo y máximo opcionales. Sin `estado`, lista
 * solo las activas; `todos` trae también las dadas de baja (para poder
 * reactivarlas).
 */
export const queryUnidadFuncionalSchema = z
  .object({
    id_proyecto: z.coerce.number().int().positive().optional(),
    tipologia: z.enum(TipologiaUnidad).optional(),
    superficie_min: z.coerce.number().nonnegative().optional(),
    superficie_max: z.coerce.number().nonnegative().optional(),
    estado: z
      .enum(['true', 'false', 'todos'])
      .transform((valor) => (valor === 'todos' ? valor : valor === 'true'))
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .refine(
    ({ superficie_min, superficie_max }) =>
      superficie_min === undefined ||
      superficie_max === undefined ||
      superficie_min <= superficie_max,
    {
      message: 'La superficie mínima no puede ser mayor que la máxima',
      path: ['superficie_min'],
    },
  );

export class QueryUnidadFuncionalDto extends createZodDto(
  queryUnidadFuncionalSchema,
) {}