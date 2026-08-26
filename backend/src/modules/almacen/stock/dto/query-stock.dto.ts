import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const queryStockSchema = z.object({
  FK_deposito: z.coerce.number().int().positive().optional(),
  es_obrador: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  FK_Categoria: z.coerce.number().int().positive().optional(),
  // Coincidencia parcial contra ARTICULO.nombre.
  nombreArticulo: z.string().trim().min(1).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryStockDto extends createZodDto(queryStockSchema) {}
