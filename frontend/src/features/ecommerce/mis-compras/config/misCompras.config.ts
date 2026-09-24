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

export const CRONOGRAMA = {
  titulo: 'Cronograma de cuotas',
  declararPago: 'Declarar un pago',
  pagoPresencial:
    'Por ahora no se pueden declarar pagos desde la web. Acercate a nuestras oficinas para pagar tus cuotas de forma presencial.',
  pagoContado:
    'Tu compra es de contado: el pago se hace de forma presencial en nuestras oficinas, no se declara desde la web.',
} as const

export const DECLARAR_PAGO = {
  titulo: 'Declarar un pago',
  volverADeclarar: 'Volver a declarar',
  saldoPendiente: 'Saldo pendiente',
  formaPago: 'Forma de pago',
  formaPagoPlaceholder: 'Elegí cómo pagaste',
  importe: 'Importe',
  importePlaceholder: 'Ej. 1.600.000,50',
  importeAyuda: 'Usá coma para los decimales. El punto de los miles es opcional.',
  importeInterpretado: 'Vas a declarar',
  referencia: 'Número de referencia',
  referenciaPlaceholder: 'Ej. número de operación o de transferencia',
  avisoValidacion:
    'Tesorería valida tu pago contra el extracto bancario, por eso el número de referencia tiene que ser exacto. No hace falta adjuntar ningún comprobante.',
  cancelar: 'Cancelar',
  confirmar: 'Declarar pago',
  exito: 'Registramos tu pago. Queda pendiente hasta que Tesorería lo valide.',
  completarDatos: 'Antes de declarar un pago necesitamos tu DNI/CUIT y tu teléfono.',
} as const

export const DECLARACIONES_PAGO = {
  titulo: 'Pagos declarados',
  descripcion:
    'Los pagos que declaraste desde la web. Mientras Tesorería no los valide, no descuentan el saldo de la cuota.',
  vacio: 'Todavía no declaraste pagos sobre esta unidad.',
  error: 'No pudimos cargar tus pagos declarados.',
  referencia: 'Ref.',
  declaradoEl: 'Declarado el',
  motivoRechazo: 'Motivo del rechazo',
  pendiente:
    'Tesorería todavía no revisó este pago. El saldo de la cuota no cambia hasta que lo valide.',
  validada: 'Validado: el pago ya figura en tu historial de pagos.',
  cobroAnulado: 'El pago que se había registrado a partir de esta declaración fue anulado.',
} as const

export const ESTADO_DECLARACION_LABEL = {
  PENDIENTE: 'Pendiente de validación',
  VALIDADA: 'Validado',
  RECHAZADA: 'Rechazado',
} as const

export const ORIGEN_COBRO_LABEL = {
  PRESENCIAL: 'Presencial',
  ECOMMERCE: 'Ecommerce',
} as const
