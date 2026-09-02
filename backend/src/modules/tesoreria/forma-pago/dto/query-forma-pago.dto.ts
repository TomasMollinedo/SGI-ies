import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Filtros de listado: por nombre (búsqueda parcial) y por estado.
 *
 * A diferencia del resto de los ABM, acá `estado` lleva `.default(true)`: la
 * HU-15 pide que el listado muestre por defecto solo las formas de pago
 * activas. El filtro sigue siendo opcional para el cliente — se manda
 * `?estado=false` para ver las dadas de baja — pero al omitirlo el schema
 * resuelve `true` en vez de dejar el campo `undefined`, así el service filtra
 * por activas sin tener que acordarse de aplicar el default por su cuenta.
 *
 * `estado` entra como `'true'`/`'false'` y no como boolean porque los query
 * params llegan siempre string. El `.default(true)` va con el valor de salida
 * (boolean) y no con el de entrada: en Zod 4 `.default()` es posterior al
 * `.transform()`.
 */
export const queryFormaPagoSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class QueryFormaPagoDto extends createZodDto(queryFormaPagoSchema) {}
