import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Una línea de imputación: cuánto de este cobro se aplica a una cuota
 * puntual. Que no supere el saldo pendiente de la cuota, y que la cuota sea
 * de una venta del mismo cliente del cobro, son reglas que dependen de una
 * consulta a la base — las valida el service.
 */
export const lineaImputacionCobroSchema = z.object({
  FK_cuota: z.number().int().positive(),
  importe_imputado: z
    .number()
    .positive('El importe imputado debe ser mayor a 0')
    .multipleOf(0.01, 'El importe imputado admite hasta dos decimales'),
});

/**
 * Cabecera + detalle del cobro. Nace directamente CONFIRMADO (sin borrador,
 * decisión de equipo confirmada — ver comentario de `EstadoCobro` en el
 * schema, que quedó desactualizado), así que "al menos una cuota imputada"
 * ya es exigible acá, mismo criterio que `CreatePagoDto`.
 *
 * A diferencia de Pago (que calcula `importe_total` como suma del detalle),
 * acá SÍ se recibe `importe_total` y el service lo valida contra la suma de
 * las líneas: es la fuente de verdad de lo que el cliente entregó, no un
 * dato derivable — si no coincide, es un error de carga, no un cálculo raro.
 */
export const createCobroSchema = z
  .object({
    FK_cliente: z.number().int().positive(),
    FK_forma_pago: z.number().int().positive(),
    fecha_cobro: fechaIsoSchema.optional(),
    numero_referencia: z.string().trim().max(100).optional(),
    importe_total: z
      .number()
      .positive('El importe total debe ser mayor a 0')
      .multipleOf(0.01, 'El importe total admite hasta dos decimales'),
    observaciones: z.string().trim().max(500).optional(),
    detalle: z
      .array(lineaImputacionCobroSchema)
      .min(1, 'El cobro debe imputar al menos una cuota'),
  })
  .refine(
    (data) =>
      new Set(data.detalle.map((linea) => linea.FK_cuota)).size ===
      data.detalle.length,
    {
      message: 'No se puede imputar la misma cuota dos veces en el mismo cobro',
      path: ['detalle'],
    },
  );

export class CreateCobroDto extends createZodDto(createCobroSchema) {}
