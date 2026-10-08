import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ModalidadPago } from '../../../../../generated/prisma/enums';

const estaPresente = (valor: unknown) => valor !== undefined && valor !== null;

/**
 * Las condiciones del plan de pago que se acuerda con el cliente (HU-27),
 * compartidas por la simulación (`SimularVentaDto`) y la confirmación de la
 * venta (`CreateVentaDto`): las dos tienen que validar exactamente igual,
 * o se podría simular algo que después no se puede confirmar.
 *
 * - CONTADO: solo la publicación. Se paga el 100 % del precio de lista en
 *   una única cuota, así que no lleva anticipo ni plazo.
 * - FINANCIADO: el plazo de financiación y el anticipo, en monto O en
 *   porcentaje del precio de lista (uno solo; el service calcula el otro).
 *
 * Que el anticipo en monto sea menor al precio de lista lo valida el
 * service, que es quien conoce el precio.
 */
export const camposCondicionesVenta = {
  FK_publicacion: z.number().int().positive(),
  modalidad: z.enum(ModalidadPago),
  anticipo_monto: z
    .number()
    .positive('El anticipo debe ser mayor a 0')
    .multipleOf(0.01, 'El anticipo admite hasta dos decimales')
    .nullable()
    .optional(),
  anticipo_porcentaje: z
    .number()
    .gt(0, 'El anticipo debe ser mayor a 0 %')
    .lt(100, 'El anticipo debe ser menor a 100 %')
    .multipleOf(0.01, 'El anticipo admite hasta dos decimales')
    .nullable()
    .optional(),
  FK_plazo_financiacion: z.number().int().positive().nullable().optional(),
};

/** Reglas cruzadas de `camposCondicionesVenta` (ver arriba). */
export function validarCondicionesVenta(
  datos: {
    modalidad: ModalidadPago;
    anticipo_monto?: number | null;
    anticipo_porcentaje?: number | null;
    FK_plazo_financiacion?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const hayMonto = estaPresente(datos.anticipo_monto);
  const hayPorcentaje = estaPresente(datos.anticipo_porcentaje);
  const hayPlazo = estaPresente(datos.FK_plazo_financiacion);

  if (datos.modalidad === ModalidadPago.CONTADO) {
    if (hayMonto || hayPorcentaje || hayPlazo) {
      ctx.addIssue({
        code: 'custom',
        path: ['modalidad'],
        message:
          'Una venta de contado no lleva anticipo ni plazo: se paga el 100 % del precio de lista',
      });
    }
    return;
  }

  if (!hayPlazo) {
    ctx.addIssue({
      code: 'custom',
      path: ['FK_plazo_financiacion'],
      message: 'Una venta financiada necesita un plazo de financiación',
    });
  }
  if (hayMonto === hayPorcentaje) {
    ctx.addIssue({
      code: 'custom',
      path: ['anticipo_monto'],
      message:
        'Una venta financiada necesita el anticipo en monto o en porcentaje (uno solo)',
    });
  }
}

/** Simulación del plan de pago que se está acordando, sin guardar nada. */
export const simularVentaSchema = z
  .object(camposCondicionesVenta)
  .superRefine(validarCondicionesVenta);

export class SimularVentaDto extends createZodDto(simularVentaSchema) {}
