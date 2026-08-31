import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFechaHora } from '@/shared/utils/fecha'
import type { Movimiento, StockMovimiento, UsuarioResumen } from '../types/movimiento.types'
import { formatearCodigoMovimiento } from '../utils/codigoMovimiento'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

/** Texto de los campos que vienen nulos, vacíos o en blanco. */
export const SIN_DATO = '—'

/**
 * Un campo de texto opcional, listo para mostrar. El backend devuelve `null`
 * cuando nunca se cargó, pero string vacío cuando se editó y se borró: los dos
 * casos —y el texto que quedó en solo espacios— tienen que verse igual.
 */
export function textoOSinDato(valor: string | null | undefined): string {
  return valor?.trim() || SIN_DATO
}

export function nombreCompleto(usuario: UsuarioResumen | null | undefined): string {
  if (!usuario) return SIN_DATO

  return `${usuario.nombre} ${usuario.apellido}`
}

/**
 * Las columnas de datos del listado. La de acciones la agrega la página, porque
 * necesita sus handlers.
 */
export const COLUMNAS_MOVIMIENTOS: DataTableColumn<Movimiento>[] = [
  {
    key: 'codigo',
    label: 'Código',
    // `whitespace-nowrap` para que "MOV-6" no se parta en dos líneas cuando la
    // columna queda angosta.
    render: (item) => (
      <span className="whitespace-nowrap">{formatearCodigoMovimiento(item.id_movimiento)}</span>
    ),
  },
  {
    key: 'fecha',
    label: 'Fecha y Hora',
    render: (item) => formatearFechaHora(item.fecha_movimiento),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (item) => (
      <div className="flex flex-wrap items-center gap-2">
        <span>{item.tipoMovimiento.nombre}</span>
        <Badge variant={item.tipoMovimiento.indicador_entrada ? 'active' : 'error'}>
          {item.tipoMovimiento.indicador_entrada ? 'Entrada' : 'Salida'}
        </Badge>
      </div>
    ),
  },
  { key: 'deposito', label: 'Depósito', render: (item) => item.deposito.nombre },
  { key: 'referencia', label: 'Referencia', render: (item) => textoOSinDato(item.referencia) },
  { key: 'items', label: 'Ítems', render: (item) => item._count.stockMovimientos },
  // "Creado por" no va en el listado: es trazabilidad y se ve en el detalle,
  // junto con la fecha de carga. Sacarla le deja aire a las demás columnas.
]

/** Las columnas de la grilla de líneas que se ve dentro del detalle. */
export const COLUMNAS_LINEAS: DataTableColumn<StockMovimiento>[] = [
  { key: 'articulo', label: 'Artículo', render: (linea) => linea.stock.articulo.nombre },
  { key: 'cantidad', label: 'Cantidad', render: (linea) => linea.cantidad },
  { key: 'stockAnterior', label: 'Stock anterior', render: (linea) => linea.stock_anterior },
  { key: 'stockNuevo', label: 'Stock nuevo', render: (linea) => linea.stock_nuevo },
  {
    key: 'observacion',
    label: 'Observación',
    render: (linea) => textoOSinDato(linea.observacion),
  },
]
