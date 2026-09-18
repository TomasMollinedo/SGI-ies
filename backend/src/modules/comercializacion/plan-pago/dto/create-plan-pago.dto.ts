import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  Periodicidad,
  TipoPlanPago,
} from '../../../../../generated/prisma/enums';

/**
 * Un valor "no vino": el frontend puede mandar `null` explícito o directamente
 * no mandar la clave, y para todas las reglas cruzadas de abajo las dos cosas
 * significan lo mismo.
 */
const estaPresente = (valor: unknown) => valor !== undefined && valor !== null;

/**
 * Alta de un plan de pago (HU-22).
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
 * la base que este schema no puede hacer. Se engancha en
 * `PlanPagoService.create()`, después de traer la publicación con su unidad y
 * antes de crear el plan (T105 Parte C).
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
    tipo: z.enum(TipoPlanPago),
    // El "Listo cuando" pide rechazar precio en cero o negativo.
    precio: z
      .number()
      .positive('El precio debe ser mayor a 0')
      .multipleOf(0.01, 'El precio admite hasta dos decimales'),
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
    // Uno de los dos, nunca ambos (ver superRefine). En CONTADO los dos son
    // opcionales y terminan pisados por el `.transform()`: el plan queda con
    // anticipo_porcentaje = 100 y sin anticipo_monto.
    anticipo_porcentaje: z
      .number()
      .min(0, 'El anticipo no puede ser negativo')
      .max(100, 'El anticipo no puede superar el 100%')
      .multipleOf(0.01, 'El anticipo admite hasta dos decimales')
      .nullable()
      .optional(),
    anticipo_monto: z
      .number()
      .min(0, 'El anticipo no puede ser negativo')
      .multipleOf(0.01, 'El anticipo admite hasta dos decimales')
      .nullable()
      .optional(),
    // Solo FINANCIADO (ver superRefine). Son las cuotas posteriores al
    // anticipo: la cuota 0 no se cuenta acá.
    cantidad_cuotas: z
      .number()
      .int('La cantidad de cuotas tiene que ser un número entero')
      .positive('La cantidad de cuotas debe ser mayor a 0')
      .nullable()
      .optional(),
    periodicidad: z.enum(Periodicidad).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const tienePorcentaje = estaPresente(data.anticipo_porcentaje);
    // `null` y ausente son lo mismo acá, y de paso queda tipado como
    // `number | null` para poder compararlo contra el precio más abajo.
    const anticipoMonto = data.anticipo_monto ?? null;
    const tieneMonto = anticipoMonto !== null;

    if (tienePorcentaje && tieneMonto) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_monto'],
        message:
          'El anticipo se define por porcentaje o por monto, no por los dos a la vez',
      });
    }

    // En CONTADO no hace falta: el `.transform()` de abajo lo fuerza a 100%.
    if (!tienePorcentaje && !tieneMonto && data.tipo !== TipoPlanPago.CONTADO) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_porcentaje'],
        message:
          'Falta el anticipo: indicá anticipo_porcentaje o anticipo_monto',
      });
    }

    // Un anticipo mayor al precio dejaría un saldo a financiar negativo, o
    // sea cuotas negativas. `anticipo_porcentaje` no necesita este control:
    // ya está topeado en 100 por la validación del campo.
    if (tieneMonto && anticipoMonto > data.precio) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_monto'],
        message: 'El anticipo no puede ser mayor al precio del plan',
      });
    }

    if (data.tipo === TipoPlanPago.CONTADO) {
      // Un plan CONTADO se paga en una sola cuota, así que cuotas y
      // periodicidad no solo son innecesarias: si llegaran, el motor las
      // ignoraría y el plan guardado no diría lo que el usuario cree.
      if (estaPresente(data.cantidad_cuotas)) {
        ctx.addIssue({
          code: 'custom',
          path: ['cantidad_cuotas'],
          message: 'Un plan CONTADO no lleva cantidad de cuotas',
        });
      }
      if (estaPresente(data.periodicidad)) {
        ctx.addIssue({
          code: 'custom',
          path: ['periodicidad'],
          message: 'Un plan CONTADO no lleva periodicidad',
        });
      }
      return;
    }

    if (!estaPresente(data.cantidad_cuotas)) {
      ctx.addIssue({
        code: 'custom',
        path: ['cantidad_cuotas'],
        message: 'Un plan FINANCIADO necesita la cantidad de cuotas',
      });
    }
    if (!estaPresente(data.periodicidad)) {
      ctx.addIssue({
        code: 'custom',
        path: ['periodicidad'],
        message: 'Un plan FINANCIADO necesita la periodicidad',
      });
    }
  })
  .transform((data) => {
    if (data.tipo !== TipoPlanPago.CONTADO) {
      return data;
    }

    // En CONTADO el anticipo es siempre el 100% del precio, así que el
    // sistema lo normaliza en vez de hacérselo corregir al usuario: lo que
    // haya venido en `anticipo_porcentaje` se pisa con 100 y el
    // `anticipo_monto` se descarta (en CONTADO el anticipo se expresa
    // siempre como porcentaje).
    //
    // Va después del `superRefine` a propósito: si el usuario mandó los dos
    // anticipos juntos, o un monto mayor al precio, eso ya se rechazó y este
    // transform nunca llega a correr — normalizar no puede tapar un error.
    const normalizado = { ...data, anticipo_porcentaje: 100 };
    delete normalizado.anticipo_monto;
    return normalizado;
  });

export class CreatePlanPagoDto extends createZodDto(createPlanPagoSchema) {}
