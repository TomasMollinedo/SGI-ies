import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createStockSchema = z.object({
  FK_articulo: z.number().int().positive(),
  FK_deposito: z.number().int().positive(),
  umbral_minimo: z.number().int().min(0).default(0),
  observaciones: z.string().trim().max(255).optional(),
});

export class CreateStockDto extends createZodDto(createStockSchema) {}