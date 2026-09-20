import type { ReactNode } from 'react'

/**
 * Centra su contenido horizontal y verticalmente en el espacio que queda libre
 * entre el header y el footer. Depende de que el `<main>` de PublicLayout sea
 * `flex flex-col`: con `flex-1` ocupa exactamente ese alto sobrante (sin
 * scroll de más) y, si el contenido es más alto, simplemente crece.
 */
export function PaginaCentrada({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center">{children}</div>
}
