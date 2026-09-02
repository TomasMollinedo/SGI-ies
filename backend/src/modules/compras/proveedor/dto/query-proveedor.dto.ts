import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CondicionIVA } from '../../../../../generated/prisma/enums';

/**
 * Filtros de listado: por condición frente al IVA y/o estado, más una
 * búsqueda combinada contra razón social (coincidencia parcial) o CUIT
 * (coincidencia parcial, tal como se persiste, sin guiones). Sin filtro de
 * estado, lista solo los proveedores activos (a diferencia de Marca, acá lo
 * pide la HU).
 */
export const queryProveedorSchema = z.object({
  busqueda: z.string().trim().min(1).optional(),
  condicion_iva: z.enum(CondicionIVA).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryProveedorDto extends createZodDto(queryProveedorSchema) {}
