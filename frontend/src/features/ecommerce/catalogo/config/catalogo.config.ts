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

export const ESTADOS = {
  vacioTitulo: 'No encontramos unidades con esos filtros',
  vacioDescripcion: 'Probá quitando algún filtro para ver más resultados.',
  errorTitulo: 'No pudimos cargar el catálogo',
  errorDescripcion: 'Volvé a intentarlo en un momento.',
  reintentar: 'Reintentar',
} as const
