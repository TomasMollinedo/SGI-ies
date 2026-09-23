import { MessageSquare } from 'lucide-react'
import { CONSULTA } from '../config/catalogo.config'

interface EnviarConsultaProps {
  /** Unidad sobre la que se consulta. La usa T119 para armar el envío. */
  idUnidadFuncional: number
}

/**
 * ⚠️ PLACEHOLDER DE T119 — ENVÍO DE CONSULTA (HU pendiente)
 *
 * Este archivo existe solo para reservar el lugar en el detalle de la unidad.
 * Hoy muestra el bloque, sin formulario y sin ninguna acción: T119 lo completa
 * acá adentro (formulario, validación, servicio y estados de envío) sin tocar
 * `DetalleUnidadPage` ni el resto del catálogo, que ya lo tiene montado y le
 * pasa `idUnidadFuncional`.
 *
 * Los textos están en `catalogo.config.ts`, bajo la constante `CONSULTA`.
 */
export function EnviarConsulta({ idUnidadFuncional }: EnviarConsultaProps) {
  return (
    <section
      aria-labelledby="titulo-consulta"
      data-unidad={idUnidadFuncional}
      className="border-light/15 bg-dark-deep border p-6"
    >
      <span aria-hidden="true" className="bg-primary mb-5 block h-0.5 w-12" />

      <h2
        id="titulo-consulta"
        className="text-light flex items-center gap-3 text-subtitulo font-bold"
      >
        <MessageSquare size={20} aria-hidden="true" className="text-secondary shrink-0" />
        {CONSULTA.titulo}
      </h2>

      <p className="text-light/70 mt-3 text-sm">{CONSULTA.descripcion}</p>

      <p className="text-light/60 mt-5 font-mono text-xs tracking-widest uppercase">
        {CONSULTA.proximamente}
      </p>
    </section>
  )
}
