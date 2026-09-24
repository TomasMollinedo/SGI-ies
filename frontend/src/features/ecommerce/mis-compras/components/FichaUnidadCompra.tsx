import type { ReactNode } from 'react'
import type { CondicionEntrega } from '@/shared/types/unidadFuncional.types'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { textoCondicionEntrega } from '@/shared/utils/condicionEntrega'
import { DETALLE, TARJETA } from '@/features/ecommerce/catalogo/config/catalogo.config'
import { formatearSuperficie } from '@/features/ecommerce/catalogo/utils/formatearSuperficie'
import type { MiVentaDetalle } from '../types/miVenta.types'

const SIN_DATO = '—'

interface FichaUnidadCompraProps {
  unidad: MiVentaDetalle['unidad']
  condicionEntrega: CondicionEntrega
}

/**
 * Ficha de la unidad comprada. Mismo lenguaje visual que `DatosUnidad` del
 * catálogo (misma anatomía dl/dt/dd) — no se reusa el componente porque el
 * shape de datos es distinto (acá no hay imágenes ni precio de catálogo).
 */
export function FichaUnidadCompra({ unidad, condicionEntrega }: FichaUnidadCompraProps) {
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="border-light/10 flex flex-col gap-1 border-b py-3.5 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-light/60 font-mono text-xs tracking-widest uppercase">{etiqueta}</dt>
      <dd className="text-light text-sm whitespace-pre-line sm:max-w-md sm:text-right">{valor}</dd>
    </div>
  )
}
