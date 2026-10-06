import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { booleanQuerySchema } from '../../../../common/validaciones/boolean-query.schema';

/**
 * Filtros del listado interno de clientes (HU-33), todos opcionales y
 * combinables entre sí.
 *
 * `con_compras` y `en_mora` son un solo parámetro booleano cada uno en vez de
 * dos filtros sueltos ("con compras" / "sin compras"): dos parámetros que se
 * contradicen entre sí no tienen respuesta posible, y acá `true` y `false`
 * cubren las dos mitades de la HU sin ambigüedad. Ausente = no filtra.
 *
 * El orden no es configurable: siempre por apellido y después nombre, como
 * lo pide la HU.
 */
export const queryClienteAdminSchema = z.object({
  busqueda: z.string().trim().min(1).optional(),
  con_compras: booleanQuerySchema.optional(),
  en_mora: booleanQuerySchema.optional(),
  FK_proyecto: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryClienteAdminDto extends createZodDto(
  queryClienteAdminSchema,
) {}
