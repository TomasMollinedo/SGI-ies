import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { StatTile } from '@/shared/components/common/StatTile'
import { cn } from '@/shared/utils/cn'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import type { IngresosEgresosResponse } from '../types/tablero.types'
import {
  claseColorResultado,
  claseColorVariacion,
  formatearImporteConSigno,
  formatearVariacion,
  type SentidoFavorable,
} from '../utils/formato'

interface IndicadoresTableroProps {
  datos: IngresosEgresosResponse
}

/**
 * Los tres números clave del rango elegido, cada uno con su variación contra
 * el rango anterior de igual duración. El resultado lleva el signo en el
 * texto (+ / −): el color solo acompaña.
 */
export function IndicadoresTablero({ datos }: IndicadoresTableroProps) {
  const { totales, variacion, rangoAnterior } = datos
  const rangoAnteriorTexto = `${formatearFecha(rangoAnterior.desde)} – ${formatearFecha(rangoAnterior.hasta)}`

  return (
    <section aria-label="Indicadores del rango" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StatTile
        label="Ingresos"
        value={formatearImporte(totales.ingresos)}
        valueClassName="wrap-anywhere"
        note={
          <NotaVariacion
            porcentaje={variacion.ingresos}
            favorable="sube"
            rangoAnterior={rangoAnteriorTexto}
          />
        }
      />

      <StatTile
        label="Egresos"
        value={formatearImporte(totales.egresos)}
        valueClassName="wrap-anywhere"
        note={
          <NotaVariacion
            porcentaje={variacion.egresos}
            favorable="baja"
            rangoAnterior={rangoAnteriorTexto}
          />
        }
      />

      <StatTile
        label="Resultado"
        value={totales.resultado === null ? '—' : formatearImporteConSigno(totales.resultado)}
        valueClassName={cn('wrap-anywhere', claseColorResultado(totales.resultado))}
        note={
          <NotaVariacion
            porcentaje={variacion.resultado}
            favorable="sube"
            rangoAnterior={rangoAnteriorTexto}
          />
        }
      />
    </section>
  )
}

interface NotaVariacionProps {
  porcentaje: number | null
  favorable: SentidoFavorable
  rangoAnterior: string
}

function NotaVariacion({ porcentaje, favorable, rangoAnterior }: NotaVariacionProps) {
  // Rango anterior en cero y actual no: no hay contra qué comparar (OBS-28).
  if (porcentaje === null) {
    return <>Sin datos del período anterior ({rangoAnterior})</>
  }

  const Icono = porcentaje === 0 ? Minus : porcentaje > 0 ? TrendingUp : TrendingDown

  return (
    <>
      <span
        className={cn(
          'inline-flex items-center gap-1 font-semibold',
          claseColorVariacion(porcentaje, favorable)
        )}
      >
        <Icono aria-hidden="true" className="size-4" />
        {formatearVariacion(porcentaje)}
      </span>{' '}
      vs. rango anterior ({rangoAnterior})
    </>
  )
}
