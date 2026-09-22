/**
 * Contratos de `/planes-pago` (HU-22).
 *
 * IMPORTES COMO STRING: `precio`, `porcentaje_ganancia`, `margen`,
 * `anticipo_porcentaje`, `anticipo_monto` y el `importe` de cada cuota llegan
 * como `string`, no como `number` — son columnas `Decimal` en Postgres y
 * Prisma las serializa así (`"19000000"`, `"26.67"`). Es lo que documenta
 * `PlanPagoResponseDto` en el backend. Para operar con ellos está
 * `aNumero()` en `utils/decimal.ts`.
 *
 * En la dirección opuesta, los DTOs de alta/edición/simulación esperan
 * `number` (los schemas de Zod del backend los declaran como
 * `z.number().multipleOf(0.01)`), así que los payloads de acá abajo usan
 * `number`. La conversión la hace el schema del formulario.
 */

export type TipoPlanPago = 'CONTADO' | 'FINANCIADO'

export type Periodicidad = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'

/** Un plan tal como lo devuelven GET /planes-pago y GET /planes-pago/:id. */
export interface PlanPago {
  id_plan_pago: number
  FK_publicacion: number
  nombre: string
  tipo: TipoPlanPago
  precio: string
  porcentaje_ganancia: string
  margen: string
  anticipo_porcentaje: string | null
  anticipo_monto: string | null
  cantidad_cuotas: number | null
  periodicidad: Periodicidad | null
  estado: boolean
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/**
 * Datos derivados que el backend calcula contra el costo de la unidad y que
 * no existen como columna: viajan solo en la respuesta del alta y de la
 * edición.
 *
 * - `warning`: el precio quedó por debajo del costo. No bloquea nada, el plan
 *   ya se guardó.
 * - `porcentaje_ganancia_implicito`: `(precio - costo) / costo * 100`, solo si
 *   el usuario no cargó `porcentaje_ganancia` ni `margen`.
 */
export interface DerivadosPlanPago {
  warning: string | null
  porcentaje_ganancia_implicito: string | null
}

/** Respuesta de POST /planes-pago. */
export interface PlanPagoCreado extends PlanPago, DerivadosPlanPago {
  /** El anticipo resuelto a monto. No se persiste: lo consume la adhesión (T110). */
  anticipo_monto_calculado: string
}

/** Respuesta de PATCH /planes-pago/:id. Los derivados vienen en `null` si el request no cargó precio. */
export type PlanPagoActualizado = PlanPago & DerivadosPlanPago

/** Una fila del cronograma de POST /planes-pago/simular-cuotas. */
export interface CuotaSimulada {
  /** 0 = anticipo, o el total en un plan CONTADO. */
  numero: number
  importe: string
  fecha_vencimiento: string
}

/** `'todos'` incluye activos e inactivos; el backend defaultea a solo activos. */
export type FiltroEstadoPlan = 'true' | 'false' | 'todos'

export interface PlanesPagoQuery {
  FK_publicacion: number
  estado?: FiltroEstadoPlan
}

/**
 * Condiciones que definen el cronograma. Las comparten el alta y la
 * simulación, igual que `condiciones-plan-pago.schema.ts` en el backend: lo
 * que la simulación acepta es exactamente lo que el alta acepta.
 */
export interface CondicionesPlanPago {
  tipo: TipoPlanPago
  precio: number
  /** Por porcentaje o por monto, nunca los dos (lo rechaza el backend con un 400). */
  anticipo_porcentaje?: number
  anticipo_monto?: number
  /** Solo FINANCIADO: son las cuotas posteriores al anticipo. */
  cantidad_cuotas?: number
  /** Solo FINANCIADO. */
  periodicidad?: Periodicidad
}

export interface CrearPlanPagoPayload extends CondicionesPlanPago {
  FK_publicacion: number
  nombre: string
  porcentaje_ganancia?: number
  margen?: number
}

/**
 * Lo único editable. Las condiciones estructurales (tipo, anticipo, cuotas,
 * periodicidad) no entran ni como opcionales: el backend las rechaza con un
 * 400 y el formulario las muestra deshabilitadas.
 */
export interface EditarPlanPagoPayload {
  precio?: number
  porcentaje_ganancia?: number
  margen?: number
  estado?: boolean
}

/** Body de POST /planes-pago/simular-cuotas. Sin `fecha_venta`: el backend simula desde hoy. */
export type SimularCuotasPayload = CondicionesPlanPago
