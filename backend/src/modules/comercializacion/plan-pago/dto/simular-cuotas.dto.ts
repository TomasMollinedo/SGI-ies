import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';
import {
  camposCondicionesPlanPago,
  normalizarAnticipoContado,
  validarCondicionesPlanPago,
} from './condiciones-plan-pago.schema';

/**
 * Previsualización del cronograma de cuotas, sin guardar nada (T106).
 *
 * Existe para que el formulario de alta del frontend pueda mostrar "así van a
 * quedar las cuotas" ANTES de crear el plan, sin reimplementar el cálculo por
 * su cuenta: si el front hiciera su propia división, su propio redondeo y su
 * propio manejo del día 31, se desincronizaría del backend en cuanto alguna
 * de esas reglas cambie, y el cliente vería un cronograma distinto al que
 * después se genera de verdad. El único dueño del cálculo es
 * `motor-cuotas.ts`.
 *
 * Reusa los mismos campos y las mismas reglas cruzadas que
 * `CreatePlanPagoDto` (ver `condiciones-plan-pago.schema.ts`): lo que la
 * simulación acepta es exactamente lo que el alta acepta.
 *
 * No lleva `FK_publicacion` ni `nombre`: es una simulación pura, puede
 * hacerse sobre un plan que ni siquiera se vaya a crear, y no toca la base.
 */
export const simularCuotasSchema = z
  .object({
    ...camposCondicionesPlanPago,
    // Opcional: la adhesión real todavía no existe (es T110), así que si el
    // frontend no manda una fecha, el service simula desde hoy.
    fecha_venta: fechaIsoSchema.optional(),
  })
  .superRefine(validarCondicionesPlanPago)
  .transform(normalizarAnticipoContado);

export class SimularCuotasDto extends createZodDto(simularCuotasSchema) {}
