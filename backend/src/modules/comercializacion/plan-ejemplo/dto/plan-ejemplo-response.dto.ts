import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Importes y porcentajes viajan como `string` con decimales fijos (dos para
 * importes y TNA, cuatro para la tasa mensual), para que el frontend los
 * muestre sin perder precisión ni redondear por su cuenta.
 */

/** El plazo de financiación del plan, tal como está vigente hoy. */
const plazoResumenSchema = z.object({
  id_plazo_financiacion: z.number(),
  codigo: z.string(),
  cantidad_cuotas: z.number(),
  /** TNA vigente del plazo, en porcentaje (ej. "24.00"). */
  tasa_nominal_anual: z.string(),
});

/**
 * Importes calculados con el precio de lista y la TNA vigentes (sistema
 * francés). No se guardan: si cambia el precio o la tasa, cambian acá sin
 * editar el plan.
 */
export const importesPlanEjemploSchema = z.object({
  precio_lista: z.string(),
  anticipo_monto: z.string(),
  saldo_financiado: z.string(),
  /** TNA ÷ 12, en porcentaje (ej. "2.0000"). */
  tasa_mensual: z.string(),
  /** Cuota fija; la última puede diferir unos centavos (ver el cronograma de la simulación). */
  valor_cuota: z.string(),
  total_intereses: z.string(),
  total_a_pagar: z.string(),
});

export const planEjemploResponseSchema = z.object({
  id_plan_ejemplo: z.number(),
  FK_publicacion: z.number(),
  nombre: z.string(),
  anticipo_porcentaje: z.string(),
  estado: z.boolean(),
  plazo: plazoResumenSchema,
  importes: importesPlanEjemploSchema,
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class PlanEjemploResponseDto extends createZodDto(
  planEjemploResponseSchema,
) {}

/** Una fila del cronograma simulado (misma forma que guarda `CUOTA`). */
const cuotaSimuladaSchema = z.object({
  /** 0 = anticipo. */
  numero: z.number(),
  fecha_vencimiento: z.iso.datetime(),
  importe_capital: z.string(),
  importe_interes: z.string(),
  importe: z.string(),
  saldo_capital: z.string(),
});

/**
 * Simulación de un plan de ejemplo: los importes, las condiciones con las que
 * se calcularon y el cronograma completo, con vencimientos contados desde hoy.
 */
export const simulacionPlanEjemploResponseSchema =
  importesPlanEjemploSchema.extend({
    cantidad_cuotas: z.number(),
    tasa_nominal_anual: z.string(),
    cuotas: z.array(cuotaSimuladaSchema),
  });

export class SimulacionPlanEjemploResponseDto extends createZodDto(
  simulacionPlanEjemploResponseSchema,
) {}
