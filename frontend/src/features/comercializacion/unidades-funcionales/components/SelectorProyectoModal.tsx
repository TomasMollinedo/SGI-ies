import { useEffect, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { ESTADO_PROYECTO_LABEL } from '@/features/proyectos/config/proyecto.config'
import { useProyectos } from '@/features/proyectos/hooks/useProyectos'
import type { ProyectoResumen } from '@/features/proyectos/types/proyecto.types'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { useDebounce } from '@/shared/hooks/useDebounce'

const LIMITE_PAGINA = 8
const DEBOUNCE_BUSQUEDA = 400

const COLUMNAS: DataTableColumn<ProyectoResumen>[] = [
  { key: 'codigo', label: 'Código', render: (p) => p.codigo },
  { key: 'nombre', label: 'Nombre', render: (p) => p.nombre },
  {
    key: 'estado',
    label: 'Estado',
    render: (p) => (
      <Badge variant={p.estado === 'EN_PLANIFICACION' ? 'active' : 'inactive'}>
        {ESTADO_PROYECTO_LABEL[p.estado]}
      </Badge>
    ),
  },
]

interface SelectorProyectoModalProps {
  open: boolean
  onClose: () => void
  onSeleccionar: (proyecto: ProyectoResumen) => void
}

/**
 * Tabla emergente para elegir el proyecto de una unidad funcional: búsqueda +
 * paginación, no un desplegable (Definition of Done de HU-20). Envuelve al
 * `SelectorEntidadModal` genérico, mismo patrón que `SelectorArticuloModal`.
 *
 * A propósito NO filtra por estado del proyecto: cualquiera se puede elegir.
 * Si el alta no corresponde (el proyecto no está En planificación), el
 * backend la rechaza con un mensaje que el formulario muestra igual — la
 * regla de negocio la valida el backend, no esta pantalla.
 */
export function SelectorProyectoModal({ open, onClose, onSeleccionar }: SelectorProyectoModalProps) {
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)

  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)

  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced])

  useEffect(() => {
    if (!open) return
    setBusqueda('')
    setPage(1)
  }, [open])

  const { data, isFetching, error, refetch } = useProyectos(
    { busqueda: busquedaDebounced || undefined, page, limit: LIMITE_PAGINA },
    { enabled: open }
  )

  return (
    <SelectorEntidadModal<ProyectoResumen>
      open={open}
      onClose={onClose}
      titulo="Elegir proyecto"
      icono={<Building2 />}
      data={data}
      cargando={isFetching}
      error={error}
      onReintentar={() => refetch()}
      columnas={COLUMNAS}
      obtenerId={(p) => String(p.id_proyecto)}
      page={page}
      onPageChange={setPage}
      onSeleccionar={onSeleccionar}
      vacioTitulo="No se encontraron proyectos"
      filtros={
        <Input
          size="sm"
          type="search"
          placeholder="Buscar por código o nombre"
          aria-label="Buscar proyectos"
          iconLeft={<Search />}
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          className="w-72"
        />
      }
    />
  )
}