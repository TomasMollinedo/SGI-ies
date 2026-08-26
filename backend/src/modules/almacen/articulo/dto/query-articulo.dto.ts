import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const queryArticuloSchema = z.object({
  // Coincidencia parcial contra código o nombre (sin distinguir mayúsculas/minúsculas).
  busqueda: z.string().trim().min(1).optional(),
  FK_Categoria: z.coerce.number().int().positive().optional(),
  FK_Marca: z.coerce.number().int().positive().optional(),
  // A diferencia de los demás listados de Almacén: si no se manda `estado`,
  // acá se listan solo los activos (así lo pide la HU), no todos.
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryArticuloDto extends createZodDto(queryArticuloSchema) {}
