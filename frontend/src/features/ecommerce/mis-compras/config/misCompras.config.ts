/**
 * Textos de "Mis compras" (T112, HU-28). Igual que en el catálogo, ningún
 * texto visible se escribe dentro de los componentes.
 */

export const MIS_COMPRAS = {
  etiqueta: 'Mi cuenta',
  titulo: 'Mis compras',
  subtitulo: 'Seguí el estado de pago de las unidades que compraste.',
} as const

export const TARJETA_MI_COMPRA = {
  saldoPendiente: 'Saldo pendiente',
  cuotasVencidas: 'Tenés cuotas vencidas',
} as const

export const ESTADOS_MIS_COMPRAS = {
  vacioTitulo: 'Todavía no tenés compras registradas',
  vacioDescripcion: 'Mirá el catálogo y encontrá tu próxima unidad.',
  irAlCatalogo: 'Ver catálogo',
  errorTitulo: 'No pudimos cargar tus compras',
  errorDescripcion: 'Volvé a intentarlo en un momento.',
  reintentar: 'Reintentar',
} as const

export const MI_COMPRA_DETALLE = {
  volver: 'Volver a mis compras',
  saldoTotalPendiente: 'Saldo total pendiente',
  sinSaldoPendiente: 'Sin saldo pendiente',
  noEncontradaTitulo: 'No encontramos esta compra',
  noEncontradaDescripcion:
    'Puede que la venta haya sido cancelada o que no te pertenezca. Volvé a "Mis compras".',
} as const

export const HISTORIAL_PAGOS = {
  titulo: 'Historial de pagos',
  vacio: 'Todavía no registrás pagos sobre esta unidad.',
  error: 'No pudimos cargar el historial de pagos.',
} as const

export const ORIGEN_COBRO_LABEL = {
  PRESENCIAL: 'Presencial',
  ECOMMERCE: 'Ecommerce',
} as const
