import { z } from 'zod';
import {
  Periodicidad,
  TipoPlanPago,
} from '../../../../../generated/prisma/enums';

/**
 * Las condiciones que definen el cronograma de cuotas, compartidas por el
 * alta de un plan (`CreatePlanPagoDto`) y por la simulación previa
 * (`SimularCuotasDto`).
 *
 * Viven acá y no en `create-plan-pago.dto.ts` porque las reglas cruzadas
 * tienen que ser LAS MISMAS en los dos schemas: si la simulación validara por
 * su cuenta, el frontend podría previsualizar un plan que después el alta
 * rechaza. Zod además no deja derivar un schema de otro cuando el original
 * tiene refinements (`.omit() cannot be used on object schemas containing
 * refinements`), así que la única forma de no duplicar es compartir las
 * piezas desde acá.
 */

/**
 * Un valor "no vino": el frontend puede mandar `null` explícito o directamente
 * no mandar la clave, y para todas las reglas cruzadas las dos cosas
 * significan lo mismo.
 */
export const estaPresente = (valor: unknown) =>
  valor !== undefined && valor !== null;

/**
 * Los campos de los que depende el cálculo de cuotas. Los importes viajan
 * como `number` porque es lo que hay en JSON; el service los convierte a
 * `Prisma.Decimal` antes de calcular (ningún cálculo de dinero se hace sobre
 * `number`). El `multipleOf(0.01)` fija los dos decimales de las columnas
 * `Decimal(14, 2)`.
 */
export const camposCondicionesPlanPago = {
  tipo: z.enum(TipoPlanPago),
  // El "Listo cuando" pide rechazar precio en cero o negativo.
  precio: z
    .number()
    .positive('El precio debe ser mayor a 0')
    .multipleOf(0.01, 'El precio admite hasta dos decimales'),
  // Uno de los dos, nunca ambos (ver `validarCondicionesPlanPago`). En
  // CONTADO los dos son opcionales y terminan pisados por
  // `normalizarAnticipoContado`.
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
  // Solo FINANCIADO. Son las cuotas posteriores al anticipo: la cuota 0 no
  // se cuenta acá.
  cantidad_cuotas: z
    .number()
    .int('La cantidad de cuotas tiene que ser un número entero')
    .positive('La cantidad de cuotas debe ser mayor a 0')
    .nullable()
    .optional(),
  periodicidad: z.enum(Periodicidad).nullable().optional(),
};

/** La forma mínima sobre la que operan las reglas cruzadas y la normalización. */
export type CondicionesCargadas = {
  tipo: TipoPlanPago;
  precio: number;
  anticipo_porcentaje?: number | null;
  anticipo_monto?: number | null;
  cantidad_cuotas?: number | null;
  periodicidad?: Periodicidad | null;
};

/**
 * Reglas que miran varios campos a la vez, para un `superRefine`:
 * - el anticipo se define por porcentaje o por monto, nunca por los dos;
 * - un plan FINANCIADO necesita anticipo, cantidad de cuotas y periodicidad;
 * - un plan CONTADO no lleva cuotas ni periodicidad (y su anticipo lo
 *   normaliza `normalizarAnticipoContado`, por eso no se exige);
 * - el anticipo por monto nunca puede superar el precio.
 */
export function validarCondicionesPlanPago(
  data: CondicionesCargadas,
  ctx: z.RefinementCtx,
): void {
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

  // En CONTADO no hace falta: `normalizarAnticipoContado` lo fuerza a 100%.
  if (!tienePorcentaje && !tieneMonto && data.tipo !== TipoPlanPago.CONTADO) {
    ctx.addIssue({
      code: 'custom',
      path: ['anticipo_porcentaje'],
      message: 'Falta el anticipo: indicá anticipo_porcentaje o anticipo_monto',
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
}

/**
 * En CONTADO el anticipo es siempre el 100% del precio, así que el sistema lo
 * normaliza en vez de hacérselo corregir al usuario: lo que haya venido en
 * `anticipo_porcentaje` se pisa con 100 y el `anticipo_monto` se descarta (en
 * CONTADO el anticipo se expresa siempre como porcentaje).
 *
 * Va en un `.transform()` DESPUÉS del `superRefine` a propósito: si el usuario
 * mandó los dos anticipos juntos, o un monto mayor al precio, eso ya se
 * rechazó y esto nunca llega a correr — normalizar no puede tapar un error.
 */
export function normalizarAnticipoContado<T extends CondicionesCargadas>(
  data: T,
): T {
  if (data.tipo !== TipoPlanPago.CONTADO) {
    return data;
  }

  const normalizado = { ...data, anticipo_porcentaje: 100 };
  delete (normalizado as CondicionesCargadas).anticipo_monto;
  return normalizado;
}
