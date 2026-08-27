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

/** Una línea del detalle tal como quedó registrada, con el stock antes/después (auditoría). */
interface StockMovimientoLinea {
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
  stockMovimientos: StockMovimientoLinea[]
}

export interface LineaMovimientoPayload {
  FK_Stock: number
  cantidad: number
  observacion?: string
}

/** Body de POST /movimientos. */
export interface CrearMovimientoPayload {
  FK_TipoMovimiento: number
  FK_Deposito: number
  referencia?: string
  observaciones?: string
  detalle: LineaMovimientoPayload[]
}
