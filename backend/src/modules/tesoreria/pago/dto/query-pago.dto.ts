import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import { estadoPagoSchema } from './pago-response.dto';

/**
 * Filtros combinables del listado: proveedor, forma de pago, estado y período. `fechaDesde`/`fechaHasta` filtran por `fecha_pago` (la fecha de
 * negocio), no por `hora_creacion`. El orden (más reciente primero) es fijo,
 * no configurable por query param.
 *
 * `busquedaProveedor` filtra por la razón social del proveedor de la
 * cabecera (coincidencia parcial, palabra por palabra — ver
 * `condicionBusquedaPorPalabras`), no por su id: así el filtro de proveedor
 * del listado es un campo de texto libre, sin necesidad de elegir un
 * proveedor puntual de una lista para poder filtrar.
 */
export const queryPagoSchema = z.object({
  busquedaProveedor: z.string().trim().min(1).optional(),
  FK_forma_pago: z.coerce.number().int().positive().optional(),
  estado: estadoPagoSchema.optional(),
  fechaDesde: fechaIsoSchema.optional(),
  fechaHasta: fechaIsoSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryPagoDto extends createZodDto(queryPagoSchema) {}
