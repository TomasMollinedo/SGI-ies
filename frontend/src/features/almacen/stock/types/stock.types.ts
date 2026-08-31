/** Datos del artículo embebidos en una ficha de stock (GET /stock, GET /stock/{id}). */
export interface ArticuloResumen {
  id_articulo: number
  nombre: string
  FK_Categoria: number
  FK_Marca: number | null
}

/** Datos del depósito/obrador embebidos en una ficha de stock. */
export interface DepositoResumen {
  id_deposito: number
  nombre: string
  es_obrador: boolean
}

/** Fila del listado (GET /stock). */
export interface Stock {
  id_stock: number
  cantidad: number
  umbral_minimo: number
  observaciones: string | null
  estado: boolean
  FK_articulo: number
  FK_deposito: number
  articulo: ArticuloResumen
  deposito: DepositoResumen
}

export interface FiltrosStock {
  FK_deposito?: number
  esObrador?: boolean
  FK_Categoria?: number
  nombreArticulo?: string
  estado?: boolean
  page?: number
  limit?: number
}

interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de editar/dar de baja/reactivar (PATCH /stock/{id}[/baja|/alta]): plano, con auditoría, sin resúmenes anidados. */
export interface StockAuditado {
  id_stock: number
  cantidad: number
  umbral_minimo: number
  observaciones: string | null
  estado: boolean
  FK_articulo: number
  FK_deposito: number
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/** Respuesta de GET /stock/{id}: StockAuditado + resúmenes de artículo/depósito + quién lo creó/modificó. */
export interface StockDetalle extends StockAuditado {
  articulo: ArticuloResumen
  deposito: DepositoResumen
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

/** Body de PATCH /stock/{id}. La cantidad y las FK no son editables acá: las maneja Movimientos. */
export interface EditarStockPayload {
  umbral_minimo?: number
  observaciones?: string | null
}

/** Body de POST /stock. Vincula un artículo a un depósito; la cantidad arranca siempre en 0. */
export interface CrearStockPayload {
  FK_articulo: number
  FK_deposito: number
  umbral_minimo?: number
  observaciones?: string
}
