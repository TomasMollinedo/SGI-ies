import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { StatTile } from '@/shared/components/common/StatTile'
import { Spinner } from '@/shared/components/ui/Spinner'
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

/** El margen total realizado llega por su propia consulta, así que trae sus propios estados. */
export interface IndicadorMargenRealizado {
  /** `undefined` mientras no llegó (o si la consulta falló). */
  importe?: number
  estaCargando: boolean
  tieneError: boolean
}

interface IndicadoresTableroProps {
  datos: IngresosEgresosResponse
  margenRealizado: IndicadorMargenRealizado
}

/**
 * Los números clave: ingresos, egresos y resultado del rango elegido, cada
 * uno con su variación contra el rango anterior de igual duración, y el
 * margen total realizado. El resultado y el margen llevan el signo en el
 * texto (+ / −): el color solo acompaña.
 *
 * Con un proyecto elegido el backend no devuelve el resultado (`null`): los
 * egresos no se pueden atribuir a un proyecto. Esa tarjeta se saca, en vez de
 * dejarla con un guion, y la grilla pasa de cuatro tarjetas a tres.
 */
export function IndicadoresTablero({ datos, margenRealizado }: IndicadoresTableroProps) {
  const { totales, variacion, rangoAnterior } = datos
  const rangoAnteriorTexto = `${formatearFecha(rangoAnterior.desde)} – ${formatearFecha(rangoAnterior.hasta)}`
  const { resultado } = totales

  return (
    <section
      aria-label="Indicadores"
      className={cn(
        'grid grid-cols-1 gap-4',
        resultado === null ? 'lg:grid-cols-3' : 'sm:grid-cols-2 2xl:grid-cols-4'
      )}
    >
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

      {resultado !== null && (
        <StatTile
          label="Resultado"
          value={formatearImporteConSigno(resultado)}
          valueClassName={cn('wrap-anywhere', claseColorResultado(resultado))}
          note={
            <NotaVariacion
              porcentaje={variacion.resultado}
              favorable="sube"
              rangoAnterior={rangoAnteriorTexto}
            />
          }
        />
      )}

      <TarjetaMargenRealizado margen={margenRealizado} />
    </section>
  )
}

/**
 * Margen total realizado: solo el importe, sin porcentaje, y a la fecha. Se
 * muestra tal cual lo manda el backend: no cambia con el rango ni con el
 * proyecto elegido, y no se recalcula sumando las filas de la tabla.
 *
 * El backend lo suma sobre todos los proyectos, también los dados de baja, y
 * la tabla lista solo los activos. No hace falta aclararlo en pantalla: un
 * proyecto con ventas no puede darse de baja (la baja exige En planificación
 * sin unidades activas, publicar exige En ejecución o Finalizado, y el estado
 * de obra no retrocede), así que este número coincide con la suma de la tabla.
 */
function TarjetaMargenRealizado({ margen }: { margen: IndicadorMargenRealizado }) {
  const { importe, estaCargando, tieneError } = margen
  const tieneImporte = importe !== undefined && !tieneError

  return (
    <StatTile
      label="Margen total realizado"
      value={
        tieneImporte ? (
          formatearImporteConSigno(importe)
        ) : estaCargando ? (
          <Spinner aria-label="Cargando el margen" className="text-primary size-6" />
        ) : (
          '—'
        )
      }
      valueClassName={cn('wrap-anywhere', tieneImporte && claseColorResultado(importe))}
      note={
        tieneError
          ? 'No se pudo cargar el margen.'
          : 'A la fecha, de todos los proyectos. No cambia con el rango ni con el proyecto elegido.'
      }
    />
  )
}

interface NotaVariacionProps {
  porcentaje: number | null
  favorable: SentidoFavorable
  rangoAnterior: string
}

function NotaVariacion({ porcentaje, favorable, rangoAnterior }: NotaVariacionProps) {
  // Rango anterior en cero y actual no: no hay contra qué comparar (OBS-28).
  const comparado = <span className="mt-0.5 block">Comparado con: {rangoAnterior}</span>

  if (porcentaje === null) {
    return (
      <>
        Sin datos del período anterior
        {comparado}
      </>
    )
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
      respecto del rango anterior
      {comparado}
    </>
  )
}
