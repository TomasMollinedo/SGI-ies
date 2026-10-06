import { Outlet } from 'react-router'
import { SitioPublicoFooter } from './components/SitioPublicoFooter'
import { SitioPublicoHeader } from './components/SitioPublicoHeader'

/**
 * Estructura del sitio público rediseñado (T109): header sticky, contenido y
 * pie, todo sobre el fondo oscuro de la marca y a ancho completo.
 *
 * El `<main>` no impone padding ni ancho máximo: cada pantalla arma su propio
 * contenedor, porque la landing va de borde a borde y el resto centra una
 * tarjeta. Sí es `flex flex-col`, que es de lo que depende `PaginaCentrada`
 * para ocupar el alto sobrante.
 */
export function SitioPublicoLayout() {
  return (
    <div className="bg-dark text-light flex min-h-screen flex-col">
      <SitioPublicoHeader />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <SitioPublicoFooter />
    </div>
  )
}
