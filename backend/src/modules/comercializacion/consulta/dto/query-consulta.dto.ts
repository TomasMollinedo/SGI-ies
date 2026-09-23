import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoConsulta } from '../../../../../generated/prisma/enums';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros combinables de la cola interna (HU-26): unidad, cliente, estado y
 * período — sobre `hora_creacion`, la única fecha que tiene la consulta.
 * Orden fijo (más reciente primero, ver `ConsultaService.listar`), no
 * configurable: es una cola de trabajo, no un reporte con más opciones.
 */
export const queryConsultaSchema = z.object({
  FK_unidad_funcional: z.coerce.number().int().positive().optional(),
  FK_cliente: z.coerce.number().int().positive().optional(),
  estado: z.enum(EstadoConsulta).optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryConsultaDto extends createZodDto(queryConsultaSchema) {}
