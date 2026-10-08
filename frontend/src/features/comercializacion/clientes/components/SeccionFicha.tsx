import type { ReactNode } from 'react'

interface SeccionFichaProps {
  titulo: string
  /** Acciones de la sección, alineadas a la derecha del título. */
  acciones?: ReactNode
  children: ReactNode
}

/**
 * Una de las cinco secciones de la ficha del cliente: tarjeta con un
 * encabezado real y su contenido. Vive en la feature y no en `shared/` porque
 * hoy la usa solo esta pantalla.
 */
export function SeccionFicha({ titulo, acciones, children }: SeccionFichaProps) {
  return (
    <section className="border-subtle bg-fondotabla flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-content text-sm font-semibold">{titulo}</h2>
        {acciones}
      </div>
      {children}
    </section>
  )
}

/**
 * Mensaje de una sección sin datos. Un cliente sin compras, sin cobros o sin
 * consultas es un caso normal —es un interesado—, así que se explica en texto
 * en vez de dejar una tabla en blanco.
 */
export function SeccionVacia({ texto }: { texto: string }) {
  return <p className="text-content-muted text-sm">{texto}</p>
}
