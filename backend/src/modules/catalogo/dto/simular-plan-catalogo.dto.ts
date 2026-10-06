import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Simulación libre del catálogo público (HU-25): el cliente elige un plazo de
 * financiación activo y cuánto deja de anticipo, en monto o en porcentaje del
 * precio de lista.
 *
 * El precio NO viaja en el body: lo lee el service de la publicación, así el
 * visitante no puede simular sobre un precio que no es el de la unidad.
 *
 * Que el monto sea menor al precio y que el plazo exista y esté activo no se
 * puede validar acá (necesitan la base): lo resuelve el service.
 */
export const simularPlanCatalogoSchema = z
  .object({
    FK_plazo_financiacion: z.number().int().positive(),
    // Uno de los dos, nunca ambos (ver el `superRefine`). "Mayor a cero y menor
    // al precio" (HU-25): el porcentaje se topea acá, el monto en el service.
    anticipo_porcentaje: z
      .number()
      .gt(0, 'El anticipo debe ser mayor a 0')
      .lt(100, 'El anticipo debe ser menor al 100% del precio')
      .multipleOf(0.01, 'El anticipo admite hasta dos decimales')
      .optional(),
    anticipo_monto: z
      .number()
      .gt(0, 'El anticipo debe ser mayor a 0')
      .multipleOf(0.01, 'El anticipo admite hasta dos decimales')
      .optional(),
  })
  .superRefine((data, ctx) => {
    const tienePorcentaje = data.anticipo_porcentaje !== undefined;
    const tieneMonto = data.anticipo_monto !== undefined;

    if (tienePorcentaje === tieneMonto) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_monto'],
        message: tienePorcentaje
          ? 'El anticipo se define por porcentaje o por monto, no por los dos a la vez'
          : 'Falta el anticipo: indicá anticipo_porcentaje o anticipo_monto',
      });
    }
  });

export class SimularPlanCatalogoDto extends createZodDto(
  simularPlanCatalogoSchema,
) {}
