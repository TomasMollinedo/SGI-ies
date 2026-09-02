import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CondicionIVA } from '../../../../../generated/prisma/enums';

/**
 * Filtros de listado: por razón social (búsqueda parcial), por CUIT
 * (búsqueda exacta, tal como se persiste, sin guiones), por condición
 * frente al IVA y/o por estado (activos/inactivos). Sin filtro de estado,
 * trae ambos.
 */
export const queryProveedorSchema = z.object({
  razon_social: z.string().trim().min(1).optional(),
  cuit: z.string().trim().min(1).optional(),
  condicion_iva: z.enum(CondicionIVA).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryProveedorDto extends createZodDto(queryProveedorSchema) {}
