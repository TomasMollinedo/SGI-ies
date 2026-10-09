import { formatearMoneda } from '@/features/compras/ordenes-compra/utils/formatearMoneda'
import { StatTile } from '@/shared/components/common/StatTile'
import { Spinner } from '@/shared/components/ui/Spinner'
import type { ProyectoDetalle, ProyectoFicha } from '../types/proyecto.types'
import { formatearPorcentaje } from '../utils/formatearPorcentaje'

const SIN_DATO = '—'

interface ResumenComercialProyectoProps {
  proyecto: Pick<
    ProyectoDetalle,
    'presupuesto' | 'unidades_cargadas' | 'cantidad_unidades_planificadas'
  >
  /** `undefined` mientras carga o si la ficha falló. */
  ficha: ProyectoFicha | undefined
  cargandoFicha: boolean
}

/**
 * Los números del proyecto de un vistazo (HU-31). Presupuesto y unidades salen
 * del detalle, así que se ven aunque la ficha esté cargando o haya fallado;
 * precio estimado y % vendido salen de la ficha. Si la ficha falla quedan en
 * "—": el error se informa una sola vez, en la situación comercial.
 */
export function ResumenComercialProyecto({
  proyecto,
  ficha,
  cargandoFicha,
}: ResumenComercialProyectoProps) {
  const cargando = <Spinner className="text-primary size-6" />
  const unidadesConPrecio = ficha?.precio_estimado.unidades_calculadas ?? 0

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        className="min-w-0"
        valueClassName="text-2xl wrap-anywhere"
        label="Presupuesto"
        value={formatearMoneda(proyecto.presupuesto)}
        note="Suma del costo de las unidades activas"
      />
      <StatTile
        className="min-w-0"
        valueClassName="text-2xl wrap-anywhere"
        label="Unidades cargadas / planificadas"
        value={`${proyecto.unidades_cargadas} / ${proyecto.cantidad_unidades_planificadas}`}
      />
      <StatTile
        className="min-w-0"
        valueClassName="text-2xl wrap-anywhere"
        label="Precio estimado de venta"
        value={
          cargandoFicha
            ? cargando
            : ficha && unidadesConPrecio > 0
              ? formatearMoneda(ficha.precio_estimado.total)
              : SIN_DATO
        }
        note={
          ficha
            ? unidadesConPrecio > 0
              ? `Calculado sobre ${unidadesConPrecio} de ${ficha.unidades.length} ${ficha.unidades.length === 1 ? 'unidad' : 'unidades'}`
              : 'Ninguna unidad tiene precio de lista todavía'
            : undefined
        }
      />
      <StatTile
        className="min-w-0"
        valueClassName="text-2xl wrap-anywhere"
        label="% vendido"
        value={
          cargandoFicha
            ? cargando
            : ficha
              ? formatearPorcentaje(ficha.situacion_comercial.porcentaje_vendido)
              : SIN_DATO
        }
        note={ficha ? 'Sobre las unidades activas cargadas' : undefined}
      />
    </div>
  )
}
