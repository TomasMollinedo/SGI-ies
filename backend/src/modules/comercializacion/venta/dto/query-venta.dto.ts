import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoVenta } from '../../../../../generated/prisma/enums';

export const queryVentaSchema = z.object({
  FK_cliente: z.coerce.number().int().positive().optional(),
  FK_publicacion: z.coerce.number().int().positive().optional(),
  estado: z.enum(EstadoVenta).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryVentaDto extends createZodDto(queryVentaSchema) {}
