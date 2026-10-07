import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { BadgeVariant } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import type {
  EstadoProyecto,
  FiltroEstadoProyecto,
  ProyectoResumen,
  TipoImagenProyecto,
} from '../types/proyecto.types'

export const ESTADO_PROYECTO_LABEL: Record<EstadoProyecto, string> = {
  EN_PLANIFICACION: 'En planificación',
  EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

/** Color del badge de cada estado de obra. Cancelado solo se muestra si aparece (OBS-22). */
export const ESTADO_PROYECTO_BADGE: Record<EstadoProyecto, BadgeVariant> = {
  EN_PLANIFICACION: 'info',
  EN_EJECUCION: 'warning',
  FINALIZADO: 'active',
  CANCELADO: 'error',
}

export const TIPO_IMAGEN_PROYECTO_LABEL: Record<TipoImagenProyecto, string> = {
  RENDER: 'Render',
  PLANO: 'Plano',
}

/** Resultados por página del listado. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

export const DEBOUNCE_BUSQUEDA = 400

/** Texto de la fecha de finalización estimada cuando el proyecto no tiene una. */
export const FECHA_A_CONFIRMAR = 'A confirmar'

/**
 * Las tres opciones que acepta el backend. No hay una cuarta "sin filtro": el
 * listado siempre manda el parámetro, porque omitirlo trae solo los activos.
 */
export const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Dados de baja' },
  { value: 'todos', label: 'Todos' },
] satisfies { value: FiltroEstadoProyecto; label: string }[]

/**
 * Opciones del filtro de estado de obra. `''` = todos. Solo los tres estados
 * de HU-31: Cancelado no se ofrece mientras OBS-22 siga sin respuesta.
 */
const ESTADOS_OBRA_FILTRABLES: EstadoProyecto[] = ['EN_PLANIFICACION', 'EN_EJECUCION', 'FINALIZADO']

export const OPCIONES_ESTADO_OBRA: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  ...ESTADOS_OBRA_FILTRABLES.map((estado) => ({
    value: estado,
    label: ESTADO_PROYECTO_LABEL[estado],
  })),
]

export function esEstadoObraFiltrable(valor: string): valor is EstadoProyecto {
  return ESTADOS_OBRA_FILTRABLES.includes(valor as EstadoProyecto)
}

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * sus handlers. El orden por nombre lo resuelve el backend.
 */
export const COLUMNAS_PROYECTOS: DataTableColumn<ProyectoResumen>[] = [
  { key: 'codigo', label: 'Código', render: (item) => item.codigo },
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  { key: 'localidad', label: 'Localidad', render: (item) => item.localidad },
  {
    key: 'estadoObra',
    label: 'Estado de obra',
    render: (item) => (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={ESTADO_PROYECTO_BADGE[item.estado_obra]}>
          {ESTADO_PROYECTO_LABEL[item.estado_obra]}
        </Badge>
        {/* Solo aparece con el filtro en "Dados de baja" o "Todos". */}
        {!item.estado && <Badge variant="inactive">Dado de baja</Badge>}
      </div>
    ),
  },
  {
    key: 'unidades',
    label: 'Unidades',
    headerTooltip: 'Unidades activas cargadas / unidades planificadas',
    render: (item) => `${item.unidades_cargadas} / ${item.cantidad_unidades_planificadas}`,
  },
  {
    key: 'fechaFinEstimada',
    label: 'Finalización estimada',
    // Fecha de negocio, sin hora: se toma el día tal cual, sin conversión de zona horaria.
    render: (item) =>
      item.fecha_fin_estimada ? formatearFechaSinHora(item.fecha_fin_estimada) : FECHA_A_CONFIRMAR,
  },
]
