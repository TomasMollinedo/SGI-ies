import type { ReactNode } from 'react'
import type { CondicionEntrega, TipologiaUnidad } from '@/shared/types/unidadFuncional.types'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { textoCondicionEntrega } from '@/shared/utils/condicionEntrega'
import { DETALLE, TARJETA } from '@/features/ecommerce/catalogo/config/catalogo.config'
import { formatearSuperficie } from '@/features/ecommerce/utils/formatearSuperficie'

const SIN_DATO = '—'

/** Los únicos campos de la unidad que esta ficha necesita — nunca imágenes, precio ni planes. */
interface DatosUnidadFicha {
  identificador: string
  tipologia: TipologiaUnidad
  superficie_cubierta: number
  superficie_descubierta: number | null
  piso: string | null
  comodidades: string | null
  observaciones: string | null
}

interface FichaUnidadProps {
  unidad: DatosUnidadFicha
  condicionEntrega: CondicionEntrega
}

/**
 * Ficha de una unidad: identificador, tipología, superficies, condición de
 * entrega, comodidades y observaciones. Compartida por el catálogo público
 * (`DetalleUnidadPage`, donde el visitante decide si consulta) y por "Mis
 * compras" (`MiCompraDetallePage`, la unidad ya comprada) — antes eran dos
 * componentes casi idénticos (`DatosUnidad` y `FichaUnidadCompra`); se
 * unificaron acá al detectar la segunda copia (T112).
 */
export function FichaUnidad({ unidad, condicionEntrega }: FichaUnidadProps) {
  return (
    <section aria-labelledby="titulo-ficha-unidad" className="flex flex-col gap-6">
      <h2 id="titulo-ficha-unidad" className="text-light text-titulo-modal font-bold">
        {DETALLE.datosTitulo}
      </h2>

      <dl className="border-light/10 flex flex-col border-t">
        <Dato etiqueta={DETALLE.identificador} valor={unidad.identificador} />
        <Dato etiqueta={TARJETA.piso} valor={unidad.piso ?? SIN_DATO} />
        <Dato etiqueta="Tipología" valor={TIPOLOGIA_LABEL[unidad.tipologia]} />
        <Dato
          etiqueta={TARJETA.superficieCubierta}
          valor={formatearSuperficie(unidad.superficie_cubierta)}
        />
        {unidad.superficie_descubierta !== null && (
          <Dato
            etiqueta={TARJETA.superficieDescubierta}
            valor={formatearSuperficie(unidad.superficie_descubierta)}
          />
        )}
        <Dato etiqueta="Entrega" valor={textoCondicionEntrega(condicionEntrega)} />
        {unidad.comodidades !== null && (
          <Dato etiqueta={DETALLE.comodidades} valor={unidad.comodidades} />
        )}
        {unidad.observaciones !== null && (
          <Dato etiqueta={DETALLE.observaciones} valor={unidad.observaciones} />
        )}
      </dl>
    </section>
  )
}

/** Fila etiqueta/valor. El valor puede ser largo (comodidades), así que parte línea. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="border-light/10 flex flex-col gap-1 border-b py-3.5 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-light/60 font-mono text-xs tracking-widest uppercase">{etiqueta}</dt>
      <dd className="text-light text-sm whitespace-pre-line sm:max-w-md sm:text-right">{valor}</dd>
    </div>
  )
}
