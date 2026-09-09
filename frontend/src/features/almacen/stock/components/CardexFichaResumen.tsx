import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { stockBajoUmbral } from '../config/stock.config'
import type { CardexFicha } from '../types/cardex.types'
import { formatearCodigoStock } from '../utils/codigoStock'

interface CardexFichaResumenProps {
  ficha: CardexFicha
  /** `true` cuando hay un período aplicado: cambia la leyenda del stock actual. */
  hayPeriodoAplicado: boolean
}

/**
 * Cabecera del cardex: de qué artículo y depósito es la ficha, y cómo está hoy.
 *
 * El stock actual es el de la ficha completa. Con un período aplicado deja de
 * coincidir con el "stock posterior" de la última fila visible, así que en ese
 * caso se aclara — si no, se lee como una inconsistencia de la tabla.
 */
export function CardexFichaResumen({ ficha, hayPeriodoAplicado }: CardexFichaResumenProps) {
  const bajoUmbral = stockBajoUmbral(ficha)

  return (
    <section
      aria-label="Ficha de stock"
      className="bg-fondotabla border-subtle flex flex-col gap-4 border p-4 shadow-md"
    >
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

      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        <Dato
          etiqueta="Stock actual"
          valor={
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
          nota={hayPeriodoAplicado ? 'Total de la ficha, no del período filtrado' : undefined}
        />
        <Dato etiqueta="Umbral mínimo" valor={ficha.umbral_minimo} />
      </dl>
    </section>
  )
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: ReactNode; nota?: string }) {
  return (
    <div>
      <dt className="text-content-muted text-xs font-medium uppercase">{etiqueta}</dt>
      <dd className="text-content text-2xl font-semibold">{valor}</dd>
      {nota && <p className="text-content-muted mt-1 text-xs">{nota}</p>}
    </div>
  )
}
