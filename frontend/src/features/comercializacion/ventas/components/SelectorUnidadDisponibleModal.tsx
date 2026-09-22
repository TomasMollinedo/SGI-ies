import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import { CeldaUnidad } from '@/features/comercializacion/publicaciones/components/CeldaUnidad'
import { ProyectoCombobox } from '@/features/comercializacion/publicaciones/components/ProyectoCombobox'
import { usePublicaciones } from '@/features/comercializacion/publicaciones/hooks/usePublicaciones'
import type { PublicacionListItem } from '@/features/comercializacion/publicaciones/types/publicacion.types'

const LIMITE_PAGINA = 8

interface SelectorUnidadDisponibleModalProps {
  open: boolean
  onClose: () => void
  onSeleccionar: (publicacion: PublicacionListItem) => void
}

/**
 * Tabla emergente para elegir la unidad a vender (HU-27), mismo molde que
 * `SelectorUnidadModal` de T104. A diferencia de esa (que lista unidades SIN
 * publicación, para publicarlas), acá se listan publicaciones ya vigentes en
 * estado `DISPONIBLE` — es el mismo `GET /publicaciones` del listado interno,
 * filtrado distinto, así que reusa `usePublicaciones` en vez de un hook propio.
 */
export function SelectorUnidadDisponibleModal({
  open,
  onClose,
  onSeleccionar,
}: SelectorUnidadDisponibleModalProps) {
  const [proyecto, setProyecto] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [proyecto])

  useEffect(() => {
    if (!open) return
    setProyecto('')
    setPage(1)
  }, [open])

  const { data, isFetching, error, refetch } = usePublicaciones({
    estado_comercial: 'DISPONIBLE',
    FK_proyecto: proyecto ? Number(proyecto) : undefined,
    page,
    limit: LIMITE_PAGINA,
  })

  const columnas: DataTableColumn<PublicacionListItem>[] = [
    {
      key: 'unidad',
      label: 'Unidad',
      render: (p) => (
        <CeldaUnidad
          identificador={p.unidad.identificador}
          proyecto={p.proyecto.nombre}
          tipologia={p.unidad.tipologia}
        />
      ),
    },
  ]

  return (
    <SelectorEntidadModal<PublicacionListItem>
      open={open}
      onClose={onClose}
      titulo="Elegir unidad a vender"
      icono={<Building2 />}
      data={data}
      cargando={isFetching}
      error={error}
      onReintentar={() => refetch()}
      columnas={columnas}
      obtenerId={(p) => String(p.id_publicacion)}
      page={page}
      onPageChange={setPage}
      onSeleccionar={onSeleccionar}
      vacioTitulo="No hay unidades disponibles para vender"
      vacioDescripcion="Solo se listan publicaciones en estado «Disponible». Probá ajustar el filtro de proyecto."
      filtros={
        <div className="flex flex-wrap items-end gap-3">
          <ProyectoCombobox value={proyecto} onChange={setProyecto} className="w-full sm:w-60" />
        </div>
      }
    />
  )
}
