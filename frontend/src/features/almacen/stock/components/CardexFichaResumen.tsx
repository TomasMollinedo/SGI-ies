import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { StatTile } from '@/shared/components/common/StatTile'
import { Badge } from '@/shared/components/ui/Badge'
import { cn } from '@/shared/utils/cn'
import { stockBajoUmbral } from '../config/stock.config'
import type { CardexFicha } from '../types/cardex.types'
import { formatearCodigoStock } from '../utils/codigoStock'

interface CardexFichaResumenProps {
  ficha: CardexFicha
  /** `true` cuando hay un período aplicado: cambia la leyenda del stock actual. */
  hayPeriodoAplicado: boolean
}

/**
 * Cabecera del cardex, en tres tarjetas: de qué ficha es el historial, cuánto
 * stock tiene hoy y cuál es su umbral.
 *
 * El stock actual es el de la ficha completa. Con un período aplicado deja de
 * coincidir con el "stock posterior" de la última fila visible, así que en ese
 * caso se aclara — si no, se lee como una inconsistencia de la tabla.
 */
export function CardexFichaResumen({ ficha, hayPeriodoAplicado }: CardexFichaResumenProps) {
  const bajoUmbral = stockBajoUmbral(ficha)

  return (
    // En pantallas chicas la tarjeta de identificación ocupa la fila entera y
    // los dos números quedan lado a lado abajo; desde `lg` van las tres en fila.
    <section
      aria-label="Ficha de stock"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
    >
      <Tarjeta className="sm:col-span-2 lg:col-span-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-content-muted text-xs font-medium uppercase">
              {formatearCodigoStock(ficha.id_stock)}
            </p>
            <h2 className="text-content text-lg font-semibold">{ficha.articulo.nombre}</h2>
            <p className="text-content-muted text-sm">
              {ficha.deposito.nombre} · {ficha.deposito.es_obrador ? 'Obrador' : 'Depósito'}
            </p>
          </div>

          <Badge variant={ficha.estado ? 'active' : 'inactive'}>
            {ficha.estado ? 'Activa' : 'Dada de baja'}
          </Badge>
        </div>
      </Tarjeta>

      <StatTile
        className="flex flex-col justify-center"
        label="Stock actual"
        value={
          <span className="flex items-center gap-2">
            {ficha.cantidad}
            {bajoUmbral && (
              <TriangleAlert
                className="text-error size-5"
                aria-label="Stock bajo el umbral mínimo"
              />
            )}
          </span>
        }
        note={hayPeriodoAplicado ? 'Total de la ficha, no del período filtrado' : undefined}
      />

      <StatTile
        className="flex flex-col justify-center"
        label="Umbral mínimo"
        value={ficha.umbral_minimo}
      />
    </section>
  )
}

function Tarjeta({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('bg-fondotabla border-subtle rounded-lg border p-4 shadow-md', className)}>
      {children}
    </div>
  )
}
