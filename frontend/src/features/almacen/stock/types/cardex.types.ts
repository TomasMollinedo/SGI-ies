import type { PaginationMeta } from '@/shared/types/api.types'
import type { ArticuloResumen, DepositoResumen } from './stock.types'

interface TipoMovimientoResumen {
  id_tipo_movimiento: number
  nombre: string
  /** `true` suma stock (entrada), `false` lo resta (salida). */
  indicador_entrada: boolean
}

interface UsuarioResumen {
  nombre: string
  apellido: string
}

/**
 * Cabecera del cardex: la ficha sobre la que se consulta el historial.
 *
 * `cantidad` es el stock actual y coincide con el `stock_nuevo` de la última
 * línea del cardex completo — no del filtrado por período ni de la página que
 * se esté viendo.
 */
export interface CardexFicha {
  id_stock: number
  cantidad: number
  umbral_minimo: number
  estado: boolean
  articulo: ArticuloResumen
  deposito: DepositoResumen
}

/**
 * Una línea del cardex: el movimiento que la generó, aplanado sobre la línea
 * de detalle que afectó a esta ficha.
 *
 * `fecha_movimiento` es la fecha de negocio (la carga el usuario) y
 * `hora_creacion` la fecha de registro (cuándo se grabó): cuando la segunda es
 * posterior a la primera, el movimiento se cargó de forma retroactiva.
 *
 * `stock_anterior` y `stock_nuevo` son la foto que quedó registrada al
 * confirmar el movimiento. El backend los devuelve tal cual, sin recalcularlos.
 */
export interface CardexLinea {
  id_stock_movimiento: number
  /** El "número de movimiento": es el id de la cabecera, no hay un campo aparte. */
  id_movimiento: number
  fecha_movimiento: string
  hora_creacion: string
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  referencia: string | null
  observacion: string | null
  tipoMovimiento: TipoMovimientoResumen
  usuarioCreador: UsuarioResumen
}

/** Respuesta de GET /stock/{id}/cardex. */
export interface CardexResponse {
  ficha: CardexFicha
  data: CardexLinea[]
  meta: PaginationMeta
}

/**
 * Query params de GET /stock/{id}/cardex. `fechaDesde` y `fechaHasta` filtran
 * por `fecha_movimiento` (la fecha de negocio), no por la de registro.
 */
export interface FiltrosCardex {
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}
