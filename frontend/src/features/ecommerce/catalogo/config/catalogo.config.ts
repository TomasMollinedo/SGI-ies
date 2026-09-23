import type { SelectOption } from '@/shared/components/ui/Select'

/**
 * Textos y opciones del catálogo público (HU-25). Igual que en la landing,
 * ningún texto visible se escribe dentro de los componentes.
 */

/** Resultados por página. Es el `limit` que viaja al endpoint. */
export const LIMITE_PAGINA = 12

export const CATALOGO = {
  etiqueta: 'Catálogo',
  titulo: 'Unidades disponibles',
  subtitulo:
    'Todas las unidades en venta de nuestras obras, con su precio y su condición de entrega.',
  resultados: (total: number) =>
    total === 1 ? '1 unidad disponible' : `${total} unidades disponibles`,
} as const

export const FILTROS = {
  titulo: 'Filtros',
  abrir: 'Filtrar resultados',
  cerrar: 'Cerrar filtros',
  limpiar: 'Limpiar filtros',
  aplicar: 'Ver resultados',
  proyecto: 'Obra',
  tipologia: 'Tipología',
  entrega: 'Entrega',
} as const

/** `''` = sin filtro. Los dos valores son los que acepta `entregada` en el endpoint. */
export const OPCIONES_ENTREGA: SelectOption[] = [
  { value: '', label: 'Todas las entregas' },
  { value: 'true', label: 'Ya entregadas' },
  { value: 'false', label: 'A entregar' },
]

export const OPCION_TODAS_LAS_OBRAS = { value: '', label: 'Todas las obras' }

export const TARJETA = {
  precioDesde: 'Desde',
  piso: 'Piso',
  superficieCubierta: 'Cubierta',
  superficieDescubierta: 'Descubierta',
  sinImagen: 'Unidad sin imagen',
  verDetalle: 'Ver unidad',
} as const

export const DETALLE = {
  volver: 'Volver al catálogo',
  galeriaEtiqueta: 'Imágenes de la unidad',
  miniatura: (indice: number, total: number) => `Ver imagen ${indice} de ${total}`,
  sinImagenes: 'Esta unidad todavía no tiene imágenes',
  datosTitulo: 'La unidad',
  comodidades: 'Comodidades',
  observaciones: 'Observaciones',
  identificador: 'Unidad',
  planesTitulo: 'Planes de pago',
  planesSubtitulo: 'Precios vigentes. Coordinamos la forma de pago cuando nos consultes.',
  anticipo: 'Anticipo',
  cuotas: (cantidad: number, periodicidad: string) => `${cantidad} cuotas ${periodicidad}`,
  noEncontradaTitulo: 'No encontramos esta unidad',
  noEncontradaDescripcion:
    'Puede que se haya vendido o que ya no esté publicada. Mirá el resto del catálogo.',
} as const

/** Textos de los planes, espejo de los del panel interno (candidatos a compartir). */
export const TIPO_PLAN_LABEL = {
  CONTADO: 'Contado',
  FINANCIADO: 'Financiado',
} as const

export const PERIODICIDAD_LABEL = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
} as const

/**
 * Para acompañar a "12 cuotas …". Se escriben enteros en vez de derivarlos del
 * singular: "mensual" + "s" daría "mensuals".
 */
export const PERIODICIDAD_PLURAL = {
  MENSUAL: 'mensuales',
  BIMESTRAL: 'bimestrales',
  TRIMESTRAL: 'trimestrales',
  SEMESTRAL: 'semestrales',
  ANUAL: 'anuales',
} as const

/** Bloque de envío de consulta. Lo completa T119; ver `EnviarConsulta.tsx`. */
export const CONSULTA = {
  titulo: '¿Te interesa esta unidad?',
  descripcion:
    'Dejanos tu consulta y un asesor te contacta para coordinar una visita o contarte las formas de pago.',
  proximamente: 'Disponible próximamente',
} as const

export const ESTADOS = {
  vacioTitulo: 'No encontramos unidades con esos filtros',
  vacioDescripcion: 'Probá quitando algún filtro para ver más resultados.',
  errorTitulo: 'No pudimos cargar el catálogo',
  errorDescripcion: 'Volvé a intentarlo en un momento.',
  reintentar: 'Reintentar',
} as const
