import { useEffect, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { useProyectos } from '@/features/proyectos/hooks/useProyectos'
import type { ProyectoResumen } from '@/features/proyectos/types/proyecto.types'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import { Input } from '@/shared/components/ui/Input'
import { useDebounce } from '@/shared/hooks/useDebounce'

const LIMITE_PAGINA = 8
const DEBOUNCE_BUSQUEDA = 400

const COLUMNAS: DataTableColumn<ProyectoResumen>[] = [
  { key: 'codigo', label: 'Código', render: (p) => p.codigo },
  { key: 'nombre', label: 'Nombre', render: (p) => p.nombre },
]

interface SelectorProyectoModalProps {
  open: boolean
  onClose: () => void
  onSeleccionar: (proyecto: ProyectoResumen) => void
}

/**
 * Tabla emergente para elegir el proyecto de una unidad funcional nueva:
 * búsqueda + paginación, no un desplegable (Definition of Done de HU-20).
 * Envuelve al `SelectorEntidadModal` genérico, mismo patrón que
 * `SelectorArticuloModal`.
 *
 * Filtra por `estado=EN_PLANIFICACION`: es el único estado que admite altas de
 * unidades (`validarProyectoAdmiteAltas` en el backend). No reemplaza esa
 * validación —si un proyecto cambia de estado justo entre que se abre el
 * modal y se confirma el alta, el backend igual la rechaza con un 409 que el
 * formulario muestra— solo evita ofrecer de entrada opciones que ya se sabe
 * que van a fallar.
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
    { busqueda: busquedaDebounced || undefined, estado: 'EN_PLANIFICACION', page, limit: LIMITE_PAGINA },
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
      vacioTitulo="No hay proyectos en planificación"
      vacioDescripcion="Solo se pueden cargar unidades nuevas en proyectos En planificación."
      filtros={
        <Input
          size="sm"
          type="search"
          placeholder="Ej. Torre Nogal"
          label="Buscar por código o nombre"
          iconLeft={<Search />}
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          className="w-full sm:w-72"
        />
      }
    />
  )
}
