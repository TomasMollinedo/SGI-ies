/**
 * Contratos de `/planes-ejemplo` (HU-22).
 *
 * Un plan de ejemplo guarda solo su nombre, el anticipo en porcentaje y el
 * plazo de financiación. Todos los importes (anticipo en pesos, saldo, cuota,
 * intereses, total) los calcula el backend en cada respuesta con el precio de
 * lista y la TNA vigentes: acá nunca se calculan, solo se muestran.
 *
 * Los decimales llegan como `string` con decimales fijos (`"1500000.00"`)
 * porque son `Prisma.Decimal`; para mostrarlos están `aNumero()` y
 * `aNumeroOCero()` en `utils/decimal.ts`. En la dirección opuesta los payloads
 * llevan `number`.
 */

/** `'todos'` incluye activos e inactivos; el backend defaultea a solo activos. */
export type FiltroEstadoPlan = 'true' | 'false' | 'todos'

/** El plazo de financiación de un plan, tal como está vigente hoy. */
export interface PlazoResumen {
  id_plazo_financiacion: number
  codigo: string
  cantidad_cuotas: number
  /** En porcentaje, ej. "24.00". */
  tasa_nominal_anual: string
}

/** Los importes que calcula el backend para un plan. */
export interface ImportesPlanEjemplo {
  precio_lista: string
  anticipo_monto: string
  saldo_financiado: string
  /** TNA ÷ 12, en porcentaje con cuatro decimales. */
  tasa_mensual: string
  /** Cuota fija: la última puede diferir unos centavos. */
  valor_cuota: string
  total_intereses: string
  total_a_pagar: string
}

/** Un plan tal como lo devuelven GET, POST y PATCH de /planes-ejemplo. */
export interface PlanEjemplo {
  id_plan_ejemplo: number
  FK_publicacion: number
  nombre: string
  /** Porcentaje del precio de lista, ej. "20.00". */
  anticipo_porcentaje: string
  estado: boolean
  plazo: PlazoResumen
  importes: ImportesPlanEjemplo
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/** Respuesta de POST /planes-ejemplo/simular: los importes más las condiciones con que se calcularon. */
export interface SimulacionPlanEjemplo extends ImportesPlanEjemplo {
  cantidad_cuotas: number
  tasa_nominal_anual: string
}

export interface PlanesEjemploQuery {
  FK_publicacion: number
  estado?: FiltroEstadoPlan
}

/** Lo que define un plan además de su nombre. Lo comparten el alta y la simulación. */
export interface CondicionesPlanEjemplo {
  FK_publicacion: number
  /** Mayor a 0 y menor a 100, hasta dos decimales. */
  anticipo_porcentaje: number
  FK_plazo_financiacion: number
}

export interface CrearPlanEjemploPayload extends CondicionesPlanEjemplo {
  nombre: string
}

/** Todo opcional. `FK_publicacion` no figura: un plan no se mueve de publicación. */
export interface EditarPlanEjemploPayload {
  nombre?: string
  anticipo_porcentaje?: number
  FK_plazo_financiacion?: number
  estado?: boolean
}

/** Body de POST /planes-ejemplo/simular: las condiciones del alta, sin el nombre. */
export type SimularPlanEjemploPayload = CondicionesPlanEjemplo
