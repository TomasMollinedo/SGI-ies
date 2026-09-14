import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFecha, formatearFechaHora } from '@/shared/utils/fecha'
import { formatearCodigoMovimiento } from '@/features/almacen/movimiento/utils/codigoMovimiento'
import type { CardexLinea } from '../types/cardex.types'

/** Resultados por página del cardex. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA_CARDEX = 10

/** Texto de los campos que vienen nulos o vacíos. */
const SIN_DATO = '—'

function textoOSinDato(valor: string | null | undefined): string {
  return valor?.trim() || SIN_DATO
}

function nombreCompleto(usuario: { nombre: string; apellido: string }): string {
  return `${usuario.nombre} ${usuario.apellido}`
}

/**
 * `true` si el movimiento se registró después del día en que dice haber
 * ocurrido: es una carga retroactiva.
 *
 * Se comparan los dos días ya formateados en horario de Argentina y no los
 * instantes crudos, porque un movimiento cargado el mismo día unas horas más
 * tarde no es retroactivo, y comparar `Date` contra `Date` lo marcaría como tal.
 */
function esCargaRetroactiva(linea: CardexLinea): boolean {
  return formatearFecha(linea.hora_creacion) !== formatearFecha(linea.fecha_movimiento)
}

/**
 * Columnas del cardex. Van en el mismo orden en el que se lee la ficha: primero
 * cuándo pasó y cuándo se registró, después qué movimiento fue, y al final cómo
 * quedó el saldo.
 *
 * Los saldos son los que el backend registró al confirmar cada movimiento: acá
 * no se recalcula ni se acumula nada, solo se muestran.
 */
export const COLUMNAS_CARDEX: DataTableColumn<CardexLinea>[] = [
  {
    key: 'numero',
    label: 'N.º Movimiento',
    render: (linea) => (
      <span className="whitespace-nowrap">{formatearCodigoMovimiento(linea.id_movimiento)}</span>
    ),
  },
  {
    key: 'fechaMovimiento',
    label: 'Fecha del movimiento',
    render: (linea) => (
      <span className="whitespace-nowrap">{formatearFechaHora(linea.fecha_movimiento)}</span>
    ),
  },
  {
    key: 'fechaRegistro',
    label: 'Fecha de registro',
    render: (linea) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="whitespace-nowrap">{formatearFechaHora(linea.hora_creacion)}</span>
        {/* Marca la diferencia entre cuándo pasó y cuándo se cargó, que es lo
            que hace visible un movimiento cargado a destiempo. */}
        {esCargaRetroactiva(linea) && (
          <Badge variant="inactive" dot={false}>
            Retroactivo
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (linea) => (
      <div className="flex flex-wrap items-center gap-2">
        <span>{linea.tipoMovimiento.nombre}</span>
        <Badge variant={linea.tipoMovimiento.indicador_entrada ? 'active' : 'error'}>
          {linea.tipoMovimiento.indicador_entrada ? 'Entrada' : 'Salida'}
        </Badge>
      </div>
    ),
  },
  {
    key: 'cantidad',
    label: 'Cantidad',
    // Con signo: de un vistazo se ve si la línea sumó o restó, sin tener que
    // leer la columna de tipo.
    render: (linea) => (
      <span className={linea.tipoMovimiento.indicador_entrada ? 'text-success' : 'text-error'}>
        {linea.tipoMovimiento.indicador_entrada ? '+' : '−'}
        {linea.cantidad}
      </span>
    ),
  },
  { key: 'stockAnterior', label: 'Stock anterior', render: (linea) => linea.stock_anterior },
  {
    key: 'stockPosterior',
    label: 'Stock posterior',
    render: (linea) => <span className="font-medium">{linea.stock_nuevo}</span>,
  },
  { key: 'referencia', label: 'Referencia', render: (linea) => textoOSinDato(linea.referencia) },
  {
    key: 'usuario',
    label: 'Responsable',
    render: (linea) => nombreCompleto(linea.usuarioCreador),
  },
]
