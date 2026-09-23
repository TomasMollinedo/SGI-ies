import type { ReactNode } from 'react'
import type { UnidadCatalogoDetalle } from '@/features/ecommerce/types/catalogoPublico.types'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { textoCondicionEntrega } from '@/shared/utils/condicionEntrega'
import { DETALLE, TARJETA } from '../config/catalogo.config'
import { formatearSuperficie } from '../utils/formatearSuperficie'

const SIN_DATO = '—'

interface DatosUnidadProps {
  unidad: UnidadCatalogoDetalle
}

/** Ficha de la unidad: lo que el visitante necesita para decidir si consulta. */
export function DatosUnidad({ unidad }: DatosUnidadProps) {
  return (
    <section aria-labelledby="titulo-datos-unidad" className="flex flex-col gap-6">
      <h2 id="titulo-datos-unidad" className="text-light text-titulo-modal font-bold">
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
        <Dato etiqueta="Entrega" valor={textoCondicionEntrega(unidad.condicion_entrega)} />
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
