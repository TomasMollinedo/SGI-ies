import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import { Badge } from '@/shared/components/ui/Badge'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_TIPOLOGIA, esTipologia } from '@/shared/config/tipologiaUnidad.config'
import { CLASES_BADGE_MOBILE } from '../config/publicacion.config'
import { useUnidadesPublicables } from '../hooks/usePublicaciones'
import type { UnidadPublicable } from '../types/publicacion.types'
import { formatearSuperficie } from '../utils/formatearSuperficie'
import { CeldaUnidad } from './CeldaUnidad'
import { ProyectoCombobox } from './ProyectoCombobox'

const LIMITE_PAGINA = 8

// Tres columnas (más la de "Elegir" que agrega el modal) para que entre en mobile sin scroll horizontal.
const COLUMNAS: DataTableColumn<UnidadPublicable>[] = [
  {
    key: 'unidad',
    label: 'Unidad',
    render: (u) => (
      <CeldaUnidad
        identificador={u.unidad.identificador}
        proyecto={u.proyecto.nombre}
        tipologia={u.unidad.tipologia}
      />
    ),
  },
  {
    key: 'datos',
    label: 'Datos',
    render: (u) => (
      <div className="text-xs">
        <p className="text-content">{formatearSuperficie(u.unidad.superficie_cubierta)}</p>
        <p className="text-content-muted">Piso {u.unidad.piso ?? '—'}</p>
      </div>
    ),
  },
  {
    key: 'publicable',
    label: 'Publicable',
    render: (u) =>
      u.publicable ? (
        <Badge variant="active" className={CLASES_BADGE_MOBILE}>
          Publicable
        </Badge>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="warning" className={CLASES_BADGE_MOBILE}>
            No publicable
          </Badge>
          {u.motivo_no_publicable && (
            <p className="text-content-muted text-xs wrap-anywhere">{u.motivo_no_publicable}</p>
          )}
        </div>
      ),
  },
]

interface SelectorUnidadModalProps {
  open: boolean
  onClose: () => void
  onSeleccionar: (unidad: UnidadPublicable) => void
}

/**
 * Tabla emergente para elegir la unidad a publicar. Envuelve al
 * `SelectorEntidadModal` genérico con los filtros de proyecto y tipología.
 * Las unidades `publicable: false` se pueden elegir igual: si el backend las
 * rechaza, el paso de confirmación explica por qué.
 */
export function SelectorUnidadModal({ open, onClose, onSeleccionar }: SelectorUnidadModalProps) {
  const [proyecto, setProyecto] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [proyecto, tipologia])

  useEffect(() => {
    if (!open) return
    setProyecto('')
    setTipologia('')
    setPage(1)
  }, [open])

  const { data, isFetching, error, refetch } = useUnidadesPublicables(
    {
      FK_proyecto: proyecto ? Number(proyecto) : undefined,
      tipologia: esTipologia(tipologia) ? tipologia : undefined,
      page,
      limit: LIMITE_PAGINA,
    },
    { enabled: open }
  )

  return (
    <SelectorEntidadModal<UnidadPublicable>
      open={open}
      onClose={onClose}
      titulo="Elegir unidad funcional"
      icono={<Building2 />}
      data={data}
      cargando={isFetching}
      error={error}
      onReintentar={() => refetch()}
      columnas={COLUMNAS}
      obtenerId={(u) => String(u.unidad.id_unidad_funcional)}
      page={page}
      onPageChange={setPage}
      onSeleccionar={onSeleccionar}
      vacioTitulo="No hay unidades para publicar"
      vacioDescripcion="Solo se listan unidades sin publicación vigente. Probá ajustar los filtros."
      filtros={
        <div className="flex flex-wrap items-end gap-3">
          <ProyectoCombobox value={proyecto} onChange={setProyecto} className="w-full sm:w-60" />
          <Select
            size="sm"
            label="Tipología"
            options={OPCIONES_TIPOLOGIA}
            value={tipologia}
            onChange={(evento) => setTipologia(evento.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      }
    />
  )
}
