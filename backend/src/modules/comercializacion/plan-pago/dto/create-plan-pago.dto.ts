import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  camposCondicionesPlanPago,
  normalizarAnticipoContado,
  validarCondicionesPlanPago,
} from './condiciones-plan-pago.schema';

/**
 * Alta de un plan de pago (HU-22).
 *
 * Las condiciones que definen el cronograma (tipo, precio, anticipo, cuotas y
 * periodicidad) y sus reglas cruzadas viven en
 * `condiciones-plan-pago.schema.ts`, compartidas con `SimularCuotasDto`: la
 * previsualización del frontend tiene que validar exactamente igual que el
 * alta. Acá quedan solo los campos propios del alta.
 *
 * Los importes viajan como `number` porque es lo que hay en JSON; el service
 * los convierte a `Prisma.Decimal` antes de calcular o guardar (ningún
 * cálculo de dinero se hace sobre `number`). El `multipleOf(0.01)` fija los
 * dos decimales de las columnas `Decimal(14, 2)`, mismo criterio que
 * `CreatePagoDto`.
 *
 * No incluye `estado` (el plan nace activo por el `@default(true)` de
 * PLANPAGO) ni los campos de auditoría, que salen del usuario autenticado.
 *
 * El schema no solo valida: en un plan CONTADO normaliza el anticipo a 100%
 * (ver el `.transform()` del final), así que lo que sale de acá no es
 * necesariamente igual a lo que mandó el cliente.
 *
 * REGLA QUE NO VA ACÁ — "precio menor al costo de la unidad": necesita el
 * `UNIDADFUNCIONAL.costo` que cuelga de la publicación, o sea una consulta a
 * la base que este schema no puede hacer. La resuelve
 * `PlanPagoService.create()`, que devuelve un warning sin bloquear el alta.
 */
export const createPlanPagoSchema = z
  .object({
    // En el body y no en la ruta, mismo criterio que `CreateComprobanteDto`
    // con `FK_proveedor`. Si el endpoint terminara siendo anidado
    // (POST /publicaciones/:id/planes), se saca de acá y pasa a `@Param`.
    FK_publicacion: z.number().int().positive(),
    nombre: z
      .string()
      .trim()
      .min(1, 'El nombre del plan es obligatorio')
      .max(100),
    // Opcionales: PLANPAGO los defaultea en 0. Son la ayuda de cálculo del
    // formulario (costo + ganancia + margen), no la fuente de verdad del
    // precio — el service no está obligado a que cierren contra `precio`.
    porcentaje_ganancia: z
      .number()
      .min(0, 'El porcentaje de ganancia no puede ser negativo')
      // Decimal(5, 2) en el schema: no entra nada de 1000 para arriba.
      .max(999.99, 'El porcentaje de ganancia no puede superar 999,99')
      .multipleOf(0.01, 'El porcentaje de ganancia admite hasta dos decimales')
      .optional(),
    margen: z
      .number()
      .min(0, 'El margen no puede ser negativo')
      .multipleOf(0.01, 'El margen admite hasta dos decimales')
      .optional(),
    ...camposCondicionesPlanPago,
  })
  .superRefine(validarCondicionesPlanPago)
  .transform(normalizarAnticipoContado);

export class CreatePlanPagoDto extends createZodDto(createPlanPagoSchema) {}
