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

interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Una línea del detalle tal como la devuelve el backend, con el artículo resuelto. */
export interface DetalleOrdenCompra {
  id_detalle_orden_compra: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  articulo: ArticuloResumen
}

/** Una fila del historial de cambios de estado, más reciente primero. */
export interface HistorialEstadoOrdenCompra {
  id_historial: number
  estado_anterior: EstadoOrdenCompra
  estado_nuevo: EstadoOrdenCompra
  observacion: string | null
  fecha: string
  usuario: UsuarioResumen
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
  historialEstados: HistorialEstadoOrdenCompra[]
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

/**
 * Body de PATCH /ordenes-compra/:id/estado.
 *
 * `observacion` (singular) es la nota de ESTE cambio puntual: queda en su
 * propia fila del historial de estados, y es distinta de `observaciones`
 * (plural) de `OrdenCompra`, que es la observación general de la orden.
 */
export interface CambiarEstadoOrdenCompraPayload {
  estado: EstadoOrdenCompra
  motivo_cancelacion?: string
  observacion?: string
}

/** Fila del listado (GET /ordenes-compra): la orden sin el detalle ni el historial de estados. */
export type OrdenCompraListItem = Omit<OrdenCompra, 'detalles' | 'historialEstados'>

/**
 * Query params de GET /ordenes-compra. Los que van `undefined` no se envían.
 * `fechaDesde`/`fechaHasta` filtran por `fecha_emision` (la fecha de negocio).
 */
export interface OrdenesCompraQuery {
  FK_proveedor?: number
  estado?: EstadoOrdenCompra
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}
