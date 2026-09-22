import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import { NAVEGACION } from '@/features/ecommerce/config/sitioPublico.config'
import { useProyectosDestacados } from '@/features/ecommerce/hooks/useProyectosDestacados'
import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'
import { scrollASeccion } from '@/features/ecommerce/utils/scrollASeccion'
import { SeccionComoFunciona } from './components/SeccionComoFunciona'
import { SeccionContacto } from './components/SeccionContacto'
import { SeccionHero } from './components/SeccionHero'
import { SeccionNosotros } from './components/SeccionNosotros'
import { SeccionObras } from './components/SeccionObras'

/**
 * Landing pública del ecommerce (HU-24). Es la raíz del sitio y se ve sin
 * sesión. El header, el pie y el fondo los pone `SitioPublicoLayout`, que
 * comparte con el resto de las pantallas del cliente.
 *
 * Los destacados se piden acá, y no dentro de su sección, porque el resultado
 * decide si la sección existe.
 */
export function LandingPage() {
  const { hash } = useLocation()
  const { data, isLoading, isError, error } = useProyectosDestacados()

  const proyectos = data?.data ?? []
  // Mientras carga, la sección existe (muestra skeletons). Vacía o con error
  // desaparece por completo, y con ella su ancla y su ítem del menú.
  const hayObras = isLoading || (!isError && proyectos.length > 0)

  const seccionesPresentes = useMemo<IdSeccion[]>(
    () => NAVEGACION.map((item) => item.id).filter((id) => id !== 'obras' || hayObras),
    [hayObras]
  )

  // Llegada desde otra pantalla con un ancla (ej. "OBRAS" desde el perfil, que
  // navega a /#obras): el navegador no desplaza solo en una SPA.
  useEffect(() => {
    const id = hash.slice(1) as IdSeccion
    if (id && seccionesPresentes.includes(id)) scrollASeccion(id)
  }, [hash, seccionesPresentes])

  // La sección se oculta sin avisarle al visitante: el rastro del fallo queda
  // en la consola para poder diagnosticarlo.
  useEffect(() => {
    if (isError) {
      console.error('No se pudieron cargar los proyectos destacados de la landing:', error)
    }
  }, [isError, error])

  return (
    <>
      <SeccionHero />
      <SeccionNosotros />
      {hayObras && <SeccionObras proyectos={proyectos} cargando={isLoading} />}
      <SeccionComoFunciona />
      <SeccionContacto />
    </>
  )
}
