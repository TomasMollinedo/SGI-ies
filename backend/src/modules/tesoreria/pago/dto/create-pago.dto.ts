import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Una línea de imputación: cuánto de esta orden de pago se aplica a un
 * comprobante puntual. El importe lo propone la UI igual al saldo pendiente,
 * pero acá solo se fija la forma del contrato — que sea mayor a 0 y que no
 * supere el saldo pendiente del comprobante es una regla de negocio que
 * depende de una consulta a la base, y la valida el service.
 */
export const lineaImputacionSchema = z.object({
  FK_comprobante_proveedor: z.number().int().positive(),
  importe_imputado: z
    .number()
    .positive('El importe imputado debe ser mayor a 0')
    .multipleOf(0.01, 'El importe imputado admite hasta dos decimales'),
});

/**
 * Cabecera + detalle de la orden de pago.
 *
 * A diferencia de OrdenCompra y Comprobante, acá el detalle SÍ exige mínimo
 * una línea en este mismo DTO (`.min(1)`): esos dos documentos nacen en
 * BORRADOR y admiten quedar vacíos hasta que se confirman, pero la orden de
 * pago nace directamente CONFIRMADA (no tiene estado borrador), así que "al
 * menos un comprobante imputado" ya es exigible en el contrato de creación.
 *
 * No incluye `importe_total` (lo calcula el service como suma de las
 * imputaciones), `estado` (nace siempre CONFIRMADA) ni campos de auditoría.
 */
export const createOrdenPagoSchema = z
  .object({
    FK_proveedor: z.number().int().positive(),
    FK_forma_pago: z.number().int().positive(),
    // Opcional: si no viene, el service usa la fecha de hoy. Nunca admite
    // fechas futuras (validación en el service, no acá).
    fecha_pago: fechaIsoSchema.optional(),
    // Obligatorio a nivel de service cuando la forma de pago seleccionada lo
    // requiere (FORMAPAGO.requiere_referencia) — no se puede validar acá
    // porque depende de una consulta a la base.
    numero_referencia: z.string().trim().max(100).optional(),
    observaciones: z.string().trim().max(500).optional(),
    detalle: z
      .array(lineaImputacionSchema)
      .min(1, 'La orden de pago debe imputar al menos un comprobante'),
  })
  .refine(
    (data) =>
      new Set(data.detalle.map((linea) => linea.FK_comprobante_proveedor))
        .size === data.detalle.length,
    {
      message:
        'No se puede imputar el mismo comprobante dos veces en la misma orden de pago',
      path: ['detalle'],
    },
  );

export class CreateOrdenPagoDto extends createZodDto(createOrdenPagoSchema) {}
