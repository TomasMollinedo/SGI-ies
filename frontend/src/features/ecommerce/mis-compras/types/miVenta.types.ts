import type { CondicionEntrega, TipologiaUnidad } from '@/shared/types/unidadFuncional.types'

/**
 * Contratos de `GET /cliente/ventas/**` (T112, HU-28), tal como los expone el
 * backend (`venta-cliente-response.dto.ts`) — en snake_case, sin renombrar
 * campos, para que el mapeo sea evidente.
 */

export type EstadoVenta = 'VIGENTE' | 'CANCELADA'

interface UnidadResumen {
  id_unidad_funcional: number
  identificador: string
  tipologia: TipologiaUnidad
}

interface ProyectoResumen {
  id_proyecto: number
  nombre: string
  localidad: string
}

/** Ítem de `GET /cliente/ventas`: una unidad comprada por el cliente autenticado. */
export interface MiVentaResumen {
  id_venta: number
  estado: EstadoVenta
  fecha_adhesion: string
  unidad: UnidadResumen
  proyecto: ProyectoResumen
  condicion_entrega: CondicionEntrega
  saldo_total_pendiente: number
  /** Alcanza para la alerta de la tarjeta, sin pedir el detalle completo. */
  tiene_cuotas_vencidas: boolean
}

/** `GET /cliente/ventas`: sin paginar (un cliente no acumula tantas unidades). */
export interface MisVentasResponse {
  data: MiVentaResumen[]
}

export type EstadoCuota = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'ANULADA'
export type TipoPlanPago = 'CONTADO' | 'FINANCIADO'
export type Periodicidad = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'

interface UnidadDetalle extends UnidadResumen {
  superficie_cubierta: number
  superficie_descubierta: number | null
  piso: string | null
  comodidades: string | null
  observaciones: string | null
}

/** Condiciones congeladas al momento de la adhesión, no las de `PLANPAGO` (que puede haber cambiado). */
interface PlanMiVenta {
  nombre: string
  tipo: TipoPlanPago
  precio: number
  anticipo: number
  cantidad_cuotas: number
  periodicidad: Periodicidad | null
}

/** `vencido`/`dias_vencido` ya vienen resueltos del backend: nunca se comparan fechas a mano acá. */
export interface CuotaMiVenta {
  numero: number
  importe: number
  fecha_vencimiento: string
  saldo_pendiente: number
  estado: EstadoCuota
  vencido: boolean
  dias_vencido: number
}

/** `GET /cliente/ventas/:id`: la cabecera del resumen + unidad ampliada, plan y cronograma completo. */
export interface MiVentaDetalle {
  id_venta: number
  estado: EstadoVenta
  fecha_adhesion: string
  unidad: UnidadDetalle
  proyecto: ProyectoResumen
  condicion_entrega: CondicionEntrega
  plan: PlanMiVenta
  cuotas: CuotaMiVenta[]
  saldo_total_pendiente: number
}

interface FormaPagoResumen {
  nombre: string
}

export type OrigenCobro = 'PRESENCIAL' | 'ECOMMERCE'
export type EstadoCobro = 'CONFIRMADO' | 'ANULADO'

/**
 * Un cobro en el historial de ESTA unidad: `importe_imputado` es el subtotal
 * de lo que tocó a esta venta, nunca el total del cobro completo — un cobro
 * que imputó a cuotas de dos unidades del mismo cliente aparece partido, con
 * su propio subtotal en cada historial.
 */
export interface PagoHistorial {
  id_cobro: number
  fecha_cobro: string
  origen: OrigenCobro
  estado: EstadoCobro
  forma_pago: FormaPagoResumen
  numero_referencia: string | null
  importe_imputado: number
}

/** `GET /cliente/ventas/:id/historial-pagos`: paginado, del más reciente al más antiguo. */
export interface HistorialPagosResponse {
  data: PagoHistorial[]
  meta: {
    total: number
    page: number
    limit: number
  }
}
