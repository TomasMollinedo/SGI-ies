import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import type { Alerta } from '../types/alertas.types'

/** Resultados por página del listado. Fijo por ahora, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

export const OPCIONES_ATENDIDA: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'false', label: 'Pendientes' },
  { value: 'true', label: 'Atendidas' },
]

export const COLUMNAS_ALERTAS: DataTableColumn<Alerta>[] = [
  { key: 'tipo', label: 'Tipo', render: (item) => item.tipoAlerta.nombre },
  { key: 'mensaje', label: 'Mensaje', render: (item) => item.mensaje },
  { key: 'rol', label: 'Rol destinatario', render: (item) => item.rolDestinatario.nombre },
  {
    key: 'estado',
    label: 'Estado',
    render: (item) => (
      <Badge variant={item.atendida ? 'active' : 'inactive'}>
        {item.atendida ? 'Atendida' : 'Pendiente'}
      </Badge>
    ),
  },
]
