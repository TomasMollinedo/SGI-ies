import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoConsulta } from '../../../../../generated/prisma/enums';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Filtros combinables de la cola interna (HU-26): proyecto, identificador de
 * unidad (texto libre, coincidencia parcial), cliente, estado y período —
 * sobre `hora_creacion`, la única fecha que tiene la consulta. Orden fijo
 * (ver `ConsultaService.listar`), no configurable: es una cola de trabajo,
 * no un reporte con más opciones.
 *
 * `identificador` es independiente de `FK_proyecto` a propósito: el
 * identificador de una unidad NO es único en todo el sistema, solo dentro de
 * su proyecto (ver `UNIDADFUNCIONAL`) — buscar solo por identificador puede
 * traer coincidencias de proyectos distintos, y es el comportamiento que se
 * pidió. Combinar los dos filtros acota a una unidad puntual.
 */
export const queryConsultaSchema = z.object({
  FK_proyecto: z.coerce.number().int().positive().optional(),
  identificador: z.string().trim().min(1).optional(),
  FK_cliente: z.coerce.number().int().positive().optional(),
  estado: z.enum(EstadoConsulta).optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryConsultaDto extends createZodDto(queryConsultaSchema) {}
