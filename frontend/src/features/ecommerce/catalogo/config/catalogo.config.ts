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
  /** Aclara que el catálogo es de unidades a la venta y qué filtra "Entrega". */
  leyenda:
    'Solo mostramos unidades disponibles para la venta. «Entrega» indica el estado de la obra: «Ya entregadas» son de obras terminadas y «A entregar», de obras en construcción.',
} as const

/** `''` = sin filtro. Los dos valores son los que acepta `entregada` en el endpoint. */
export const OPCIONES_ENTREGA: SelectOption[] = [
  { value: '', label: 'Todas las entregas' },
  { value: 'true', label: 'Ya entregadas' },
  { value: 'false', label: 'A entregar' },
]

export const OPCION_TODAS_LAS_OBRAS = { value: '', label: 'Todas las obras' }

export const TARJETA = {
  precioContado: 'Precio de contado',
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

/** Planes de ejemplo y simulador de la unidad (T141). Ver `PlanesPagoUnidad` y `SimuladorPlan`. */
export const PLANES = {
  titulo: 'Financiá tu unidad',
  subtitulo: 'Calculá cuánto pagarías con anticipo y cuotas, sobre el precio de contado.',
  ejemplosTitulo: 'Planes de ejemplo',
  anticipo: 'Anticipo',
  saldoFinanciado: 'Saldo a financiar',
  cuotas: (cantidad: number) => (cantidad === 1 ? '1 cuota' : `${cantidad} cuotas`),
  tna: 'TNA',
  valorCuota: 'Valor de cuota',
  totalIntereses: 'Intereses',
  totalAPagar: 'Total a pagar',
} as const

export const SIMULADOR = {
  titulo: 'Simulá tu plan',
  descripcion: 'Elegí el plazo y cuánto querés dejar de anticipo. No hace falta iniciar sesión.',
  plazo: 'Plazo',
  plazoPlaceholder: 'Elegí un plazo',
  opcionPlazo: (cuotas: number, tna: string) => `${PLANES.cuotas(cuotas)} · TNA ${tna}`,
  modo: 'Anticipo en',
  opcionesModo: [
    { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
    { value: 'MONTO', label: 'Monto ($)' },
  ] satisfies SelectOption[],
  anticipo: 'Anticipo',
  anticipoAyuda: {
    PORCENTAJE: 'Un porcentaje mayor a 0 y menor a 100. Ej. 30',
    MONTO: 'Un monto mayor a 0 y menor al precio. Ej. 25.000.000',
  },
  simular: 'Simular',
  /** Visible siempre dentro del simulador, antes y después de simular. */
  leyenda:
    'Simulación informativa y no vinculante. Los importes son estimativos: se calculan sobre el precio de lista y la tasa vigentes de cada plazo, y pueden cambiar. No genera una reserva ni una venta.',
  errorTitulo: 'No pudimos simular el plan',
  resultadoTitulo: 'Tu simulación',
  precioContado: 'Precio de contado',
  cronogramaTitulo: 'Cronograma',
  cronogramaColumnas: {
    cuota: 'Cuota',
    capital: 'Capital',
    interes: 'Interés',
    importe: 'Importe',
  },
} as const

/** Aclaración de que la web no vende, con la invitación a consultar (T141). */
export const SIN_VENTA_ONLINE = {
  titulo: 'La compra no se hace desde la web',
  texto:
    'Este sitio es solo informativo: no se puede comprar ni reservar unidades desde acá. La compra es presencial, en nuestra oficina.',
  invitacion: 'Si te interesa esta unidad, escribinos o acercate a coordinar una visita.',
  irAContacto: 'Ver datos de contacto',
} as const

/** Bloque de envío de consulta (HU-26 / T119). Ver `EnviarConsulta.tsx`. */
export const CONSULTA = {
  titulo: '¿Te interesa esta unidad?',
  descripcion:
    'Dejanos tu consulta y un asesor te contacta para coordinar una visita o contarte las formas de pago.',
  loginBoton: 'Iniciá sesión para consultar',
  campoLabel: 'Tu consulta',
  campoPlaceholder: 'Ej. ¿Tiene cochera? ¿Qué formas de pago manejan?',
  enviar: 'Enviar consulta',
  exito: '¡Consulta enviada! Vas a poder ver la respuesta en tu perfil, en «Mis consultas».',
} as const

export const ESTADOS = {
  vacioTitulo: 'No encontramos unidades con esos filtros',
  vacioDescripcion: 'Probá quitando algún filtro para ver más resultados.',
  errorTitulo: 'No pudimos cargar el catálogo',
  errorDescripcion: 'Volvé a intentarlo en un momento.',
  reintentar: 'Reintentar',
} as const
