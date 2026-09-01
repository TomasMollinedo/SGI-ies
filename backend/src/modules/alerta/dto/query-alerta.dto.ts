import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros del listado de alertas.
 *
 * No hay filtro por rol destinatario: cada usuario ve solo las alertas de su
 * propio rol (o todas, si es Gerente General o Administrador), y eso lo
 * resuelve el service a partir del usuario autenticado. No es algo que el
 * cliente pueda elegir.
 */
export const queryAlertaSchema = z.object({
  FK_tipo_alerta: z.coerce.number().int().positive().optional(),
  atendida: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  // Rango sobre hora_creacion: es el único timestamp de la alerta.
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryAlertaDto extends createZodDto(queryAlertaSchema) {}
