interface TipoMovimientoResumen {
  id_tipo_movimiento: number
  nombre: string
  /** `true` suma stock (entrada), `false` lo resta (salida). */
  indicador_entrada: boolean
}

interface DepositoResumen {
  id_deposito: number
  nombre: string
  es_obrador: boolean
}

interface ArticuloResumen {
  id_articulo: number
  nombre: string
}

/** Nombre y apellido de quien registró el movimiento. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Una línea del detalle tal como quedó registrada, con el stock antes/después (auditoría). */
export interface StockMovimiento {
  id_stock_movimiento: number
  FK_Stock: number
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  observacion: string | null
  stock: {
    id_stock: number
    articulo: ArticuloResumen
  }
}

/** Respuesta de POST /movimientos: la cabecera completa con todas sus líneas. */
export interface MovimientoCreado {
  id_movimiento: number
  fecha_movimiento: string
  referencia: string | null
  observaciones: string | null
  FK_TipoMovimiento: number
  FK_Deposito: number
  tipoMovimiento: TipoMovimientoResumen
  deposito: DepositoResumen
  stockMovimientos: StockMovimiento[]
}

/**
 * Fila del listado (GET /movimientos). En vez de las líneas trae solo cuántas
 * son (`_count.stockMovimientos`); para verlas hay que ir al detalle.
 */
export interface Movimiento {
  id_movimiento: number
  /** Fecha de negocio, la carga el usuario. Distinta de `hora_creacion`. */
  fecha_movimiento: string
  referencia: string | null
  FK_TipoMovimiento: number
  FK_Deposito: number
  tipoMovimiento: TipoMovimientoResumen
  deposito: DepositoResumen
  usuarioCreador: UsuarioResumen
  _count: { stockMovimientos: number }
}

/** Respuesta de GET /movimientos/:id: la cabecera completa, sus líneas y su trazabilidad. */
export interface MovimientoDetalle {
  id_movimiento: number
  fecha_movimiento: string
  referencia: string | null
  observaciones: string | null
  hora_creacion: string
  FK_TipoMovimiento: number
  FK_Deposito: number
  FK_usuario_creador: number
  tipoMovimiento: TipoMovimientoResumen
  deposito: DepositoResumen
  usuarioCreador: UsuarioResumen
  stockMovimientos: StockMovimiento[]
}

/**
 * Query params de GET /movimientos. Los que van `undefined` no se envían.
 * `fechaDesde` y `fechaHasta` viajan como ISO `YYYY-MM-DD` y filtran por
 * `fecha_movimiento`, no por la fecha de carga.
 */
export interface MovimientosQuery {
  FK_Deposito?: number
  FK_TipoMovimiento?: number
  FK_articulo?: number
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}

export interface LineaMovimientoPayload {
  FK_Stock: number
  cantidad: number
  observacion?: string
}

/**
 * Body de POST /movimientos.
 *
 * `fecha_movimiento` es la fecha de negocio —cuándo pasó el movimiento— en ISO
 * 8601 con offset. Para el backend es opcional (si no va, usa el momento del
 * request), pero el formulario siempre la manda porque es un dato que carga el
 * usuario y es el que se muestra en el listado.
 */
export interface CrearMovimientoPayload {
  fecha_movimiento?: string
  FK_TipoMovimiento: number
  FK_Deposito: number
  referencia?: string
  observaciones?: string
  detalle: LineaMovimientoPayload[]
}
