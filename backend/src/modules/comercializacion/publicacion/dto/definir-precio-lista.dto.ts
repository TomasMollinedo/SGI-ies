import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/** `Decimal(14, 2)`: lo máximo que entra en `precio_lista` y en `margen`. */
const IMPORTE_MAXIMO = 999_999_999_999.99;

/**
 * Precio de lista de una publicación (HU-22), con la ayuda de cálculo que usó
 * Comercialización para llegar a él.
 *
 * `porcentaje_ganancia` y `margen` son opcionales y solo de referencia: el
 * precio guardado es la fuente de verdad y no tiene que cerrar contra ellos.
 * Si no viene ninguno de los dos, el precio se cargó "directo" y el service
 * calcula el porcentaje sobre el costo y deja el margen vacío (ver
 * `PublicacionService.definirPrecioLista`). `null` y "no vino" significan lo
 * mismo.
 *
 * Los importes viajan como `number` porque es lo que hay en JSON; el service
 * los convierte a `Prisma.Decimal` antes de calcular o guardar. El
 * `multipleOf(0.01)` fija los dos decimales de las columnas, mismo criterio
 * que `CreatePagoDto`.
 */
export const definirPrecioListaSchema = z.object({
  precio_lista: z
    .number()
    .positive('El precio de lista debe ser mayor a 0')
    .max(IMPORTE_MAXIMO, 'El precio de lista supera el máximo admitido')
    .multipleOf(0.01, 'El precio de lista admite hasta dos decimales'),
  porcentaje_ganancia: z
    .number()
    .min(0, 'El porcentaje de ganancia no puede ser negativo')
    // Decimal(5, 2) en el schema: no entra nada de 1000 para arriba.
    .max(999.99, 'El porcentaje de ganancia no puede superar 999,99')
    .multipleOf(0.01, 'El porcentaje de ganancia admite hasta dos decimales')
    .nullable()
    .optional(),
  margen: z
    .number()
    .min(0, 'El margen no puede ser negativo')
    .max(IMPORTE_MAXIMO, 'El margen supera el máximo admitido')
    .multipleOf(0.01, 'El margen admite hasta dos decimales')
    .nullable()
    .optional(),
});

export class DefinirPrecioListaDto extends createZodDto(
  definirPrecioListaSchema,
) {}
