import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'

/**
 * Lleva la vista a una sección de la landing. El desplazamiento es suave salvo
 * que el sistema pida menos movimiento (`prefers-reduced-motion`), en cuyo
 * caso salta directo.
 *
 * El espacio que deja el header sticky no se calcula acá: cada sección lo
 * reserva con `scroll-mt-*`, que `scrollIntoView` respeta.
 */
export function scrollASeccion(id: IdSeccion): void {
  const seccion = document.getElementById(id)
  if (!seccion) return

  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  seccion.scrollIntoView({
    behavior: prefiereMenosMovimiento ? 'auto' : 'smooth',
    block: 'start',
  })
}

/** Vuelve al tope de la página (el logo del header). */
export function scrollAlInicio(): void {
  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({ top: 0, behavior: prefiereMenosMovimiento ? 'auto' : 'smooth' })
}
