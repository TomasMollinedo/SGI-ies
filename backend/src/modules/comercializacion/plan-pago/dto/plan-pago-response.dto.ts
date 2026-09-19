import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  Periodicidad,
  TipoPlanPago,
} from '../../../../../generated/prisma/enums';

/**
 * Un plan de pago tal como viaja por HTTP.
 *
 * Los importes y porcentajes son `string`, no `number`: las columnas son
 * `Decimal` en Postgres y Prisma las devuelve como `Prisma.Decimal`, que al
 * serializarse a JSON se convierte en string (`"19000000"`, `"26.67"`). El
 * DTO de respuesta documenta lo que el frontend realmente recibe, no lo que
 * sería más cómodo — mismo criterio que las fechas ISO de
 * `FormaPagoResponseDto`.
 */
export const planPagoResponseSchema = z.object({
  id_plan_pago: z.number(),
  FK_publicacion: z.number(),
  nombre: z.string(),
  tipo: z.enum(TipoPlanPago),
  precio: z.string(),
  porcentaje_ganancia: z.string(),
  margen: z.string(),
  anticipo_porcentaje: z.string().nullable(),
  anticipo_monto: z.string().nullable(),
  cantidad_cuotas: z.number().nullable(),
  periodicidad: z.enum(Periodicidad).nullable(),
  estado: z.boolean(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

export class PlanPagoResponseDto extends createZodDto(planPagoResponseSchema) {}

/**
 * Aviso de que el precio quedó por debajo del costo de la unidad. No bloquea
 * el alta ni la edición y no se guarda en ninguna columna: es un dato del
 * momento, calculado contra el costo vigente.
 */
const warningSchema = z.string().nullable();

/**
 * Respuesta del alta: la fila creada más tres datos DERIVADOS que no existen
 * como columna en PLANPAGO.
 */
export const planPagoCreadoResponseSchema = planPagoResponseSchema.extend({
  warning: warningSchema,
  /**
   * `(precio - costo) / costo * 100`, solo cuando el usuario escribió el
   * precio final a mano sin cargar porcentaje_ganancia ni margen. `null` si
   * cargó alguno de los dos (ahí el dato real es el suyo) o si el costo de la
   * unidad es 0.
   */
  porcentaje_ganancia_implicito: z.string().nullable(),
  /**
   * El anticipo resuelto a monto, que es lo que va a consumir la adhesión
   * (T110). No se persiste: la fila conserva lo que cargó el usuario,
   * porcentaje o monto.
   */
  anticipo_monto_calculado: z.string(),
});

export class PlanPagoCreadoResponseDto extends createZodDto(
  planPagoCreadoResponseSchema,
) {}

/** Respuesta de la edición: la fila actualizada más el warning si aplica. */
export const planPagoActualizadoResponseSchema = planPagoResponseSchema.extend({
  warning: warningSchema,
});

export class PlanPagoActualizadoResponseDto extends createZodDto(
  planPagoActualizadoResponseSchema,
) {}

/**
 * Una cuota simulada. Es el mismo shape que después va a tener `CUOTA`
 * (número, importe y vencimiento), pero acá no se guarda nada: sale del motor
 * de cuotas y muere en la respuesta.
 */
export const cuotaSimuladaSchema = z.object({
  /** 0 = anticipo, o el 100% del precio en un plan CONTADO. */
  numero: z.number(),
  importe: z.string(),
  fecha_vencimiento: z.iso.datetime(),
});

export class CuotaSimuladaDto extends createZodDto(cuotaSimuladaSchema) {}
