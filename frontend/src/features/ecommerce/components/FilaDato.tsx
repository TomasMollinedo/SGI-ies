import type { ReactNode } from 'react'

interface FilaDatoProps {
  etiqueta: string
  valor: ReactNode
}

/**
 * Una fila de datos de las pantallas del cliente: etiqueta monoespaciada a la
 * izquierda y valor a la derecha, con una divisoria fina abajo (la última fila
 * de un grupo no la lleva).
 *
 * Es la versión sobre fondo oscuro del `DetailRow` del panel interno, que tiene
 * los colores fijos para fondo claro.
 */
export function FilaDato({ etiqueta, valor }: FilaDatoProps) {
  return (
    <div className="border-light/10 flex flex-col gap-1 border-b py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-light/60 font-mono text-xs tracking-widest uppercase">{etiqueta}</span>
      <span className="text-light text-sm sm:text-right">{valor}</span>
    </div>
  )
}
