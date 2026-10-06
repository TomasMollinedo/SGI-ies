import { useEffect, useState } from 'react'
import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'

/**
 * Cuál de las secciones está a la vista, para marcar el ítem del menú.
 *
 * El `rootMargin` recorta la ventana a una franja horizontal: el borde
 * superior baja lo que mide el header sticky (que tapa el inicio de cada
 * sección) y el inferior sube hasta dejar una banda angosta. Así siempre hay
 * como mucho una sección "en la franja" y el activo no parpadea entre dos.
 *
 * `ids` tiene que ser estable entre renders (una constante del módulo o un
 * `useMemo`): es la dependencia que vuelve a montar el observer.
 */
export function useSeccionActiva(ids: readonly IdSeccion[]): IdSeccion | null {
  const [seccionActiva, setSeccionActiva] = useState<IdSeccion | null>(ids[0] ?? null)

  useEffect(() => {
    const secciones = ids
      .map((id) => document.getElementById(id))
      .filter((elemento): elemento is HTMLElement => elemento !== null)

    if (secciones.length === 0) return

    const observer = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((entrada) => entrada.isIntersecting)
        if (visible) setSeccionActiva(visible.target.id as IdSeccion)
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    )

    secciones.forEach((seccion) => observer.observe(seccion))
    return () => observer.disconnect()
  }, [ids])

  return seccionActiva
}
