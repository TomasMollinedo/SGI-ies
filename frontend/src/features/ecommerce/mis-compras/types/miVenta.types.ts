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
