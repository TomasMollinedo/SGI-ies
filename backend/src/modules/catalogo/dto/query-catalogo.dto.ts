import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipologiaUnidad } from '../../../../generated/prisma/enums';

/**
 * Filtros del catálogo público, todos opcionales y combinables entre sí:
 * - `FK_proyecto`: unidades de un proyecto puntual.
 * - `localidad`: coincidencia parcial contra `PROYECTO.localidad`.
 * - `tipologia`: catálogo fijo (monoambiente, 2 dormitorios, etc.).
 * - `entregada`: condición de entrega — se resuelve contra `PROYECTO.estado`
 *   (FINALIZADO = entregada), nunca calculando el texto en memoria y
 *   filtrando después (ver `calcularCondicionEntrega`).
 */
export const queryCatalogoSchema = z.object({
  FK_proyecto: z.coerce.number().int().positive().optional(),
  localidad: z.string().trim().min(1).optional(),
  tipologia: z.enum(TipologiaUnidad).optional(),
  entregada: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export class QueryCatalogoDto extends createZodDto(queryCatalogoSchema) {}
