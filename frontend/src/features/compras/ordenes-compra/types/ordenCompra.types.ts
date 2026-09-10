export type EstadoOrdenCompra =
  'BORRADOR' | 'EMITIDA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA'

interface ProveedorResumen {
  id_proveedor: number
  razon_social: string
}

interface DepositoResumen {
  id_deposito: number
  nombre: string
}

interface ArticuloResumen {
  id_articulo: number
  nombre: string
}

/** Una línea del detalle tal como la devuelve el backend, con el artículo resuelto. */
export interface DetalleOrdenCompra {
  id_detalle_orden_compra: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  articulo: ArticuloResumen
}

/** Shape exacto de POST/PATCH/GET /ordenes-compra/:id: la orden completa con su detalle. */
export interface OrdenCompra {
  id_orden_compra: number
  fecha_emision: string
  fecha_entrega_solicitada: string | null
  observaciones: string | null
  total: number
  estado: EstadoOrdenCompra
  motivo_cancelacion: string | null
  hora_creacion: string
  hora_actualizacion: string | null
  proveedor: ProveedorResumen
  deposito: DepositoResumen
  detalles: DetalleOrdenCompra[]
}

export interface LineaOrdenCompraPayload {
  FK_articulo: number
  cantidad: number
  precio_unitario: number
}

/** Body de POST /ordenes-compra. La orden queda creada en BORRADOR. */
export interface CrearOrdenCompraPayload {
  fecha_emision?: string
  fecha_entrega_solicitada?: string
  observaciones?: string
  FK_proveedor: number
  FK_deposito: number
  detalle: LineaOrdenCompraPayload[]
}

/** Body de PATCH /ordenes-compra/:id/estado. */
export interface CambiarEstadoOrdenCompraPayload {
  estado: EstadoOrdenCompra
  motivo_cancelacion?: string
  observaciones?: string
}
