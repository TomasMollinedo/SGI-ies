import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import {
  COLUMNAS_PLAZOS_FINANCIACION,
  LIMITE_PAGINA,
} from '@/features/comercializacion/plazos-financiacion/config/plazoFinanciacion.config'
import { usePlazosFinanciacion } from '@/features/comercializacion/plazos-financiacion/hooks/usePlazosFinanciacion'
import type { PlazoFinanciacion } from '@/features/comercializacion/plazos-financiacion/types/plazoFinanciacion.types'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'

interface SelectorPlazoModalProps {
  onClose: () => void
  onSeleccionar: (plazo: PlazoFinanciacion) => void
}

/**
 * Tabla emergente para elegir el plazo de financiación de un plan (HU-22).
 * Lista solo los plazos ACTIVOS —el backend rechaza con un 409 uno dado de
 * baja—, con las mismas columnas que la pantalla de Plazos de Financiación
 * menos el estado, que acá es siempre el mismo.
 *
 * Se monta recién al abrirse y se desmonta al cerrar, así la página vuelve a
 * la primera cada vez.
 */
export function SelectorPlazoModal({ onClose, onSeleccionar }: SelectorPlazoModalProps) {
  const [page, setPage] = useState(1)
  const { data, isFetching, error, refetch } = usePlazosFinanciacion({
    estado: 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  return (
    <SelectorEntidadModal<PlazoFinanciacion>
      open
      onClose={onClose}
      titulo="Elegir plazo de financiación"
      icono={<CalendarClock />}
      data={data}
      cargando={isFetching}
      error={error}
      onReintentar={() => refetch()}
      columnas={COLUMNAS_PLAZOS_FINANCIACION.filter((columna) => columna.key !== 'estado')}
      obtenerId={(plazo) => String(plazo.id_plazo_financiacion)}
      page={page}
      onPageChange={setPage}
      onSeleccionar={onSeleccionar}
      vacioTitulo="No hay plazos de financiación activos"
      vacioDescripcion="Cargá uno desde Plazos de Financiación para poder armar planes."
    />
  )
}
