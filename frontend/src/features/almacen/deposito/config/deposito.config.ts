import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { Deposito } from '../types/deposito.types'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

/**
 * Estado se muestra como texto plano porque DataTable.render solo acepta
 * string por ahora. Pendiente: cuando se defina con el equipo ampliar el
 * primitivo a ReactNode, acá se cambia por un Badge.
 */
export const COLUMNAS_DEPOSITOS: DataTableColumn<Deposito>[] = [
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  { key: 'tipo', label: 'Tipo', render: (item) => (item.es_obrador ? 'Obrador' : 'Depósito') },
  { key: 'ubicacion', label: 'Ubicación', render: (item) => item.ubicacion ?? '' },
  {
    key: 'estado',
    label: 'Estado',
    render: (item) => (item.estado ? 'Activo' : 'Dado de baja'),
  },
]
