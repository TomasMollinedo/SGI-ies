import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const queryDepositoSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryDepositoDto extends createZodDto(queryDepositoSchema) {}
