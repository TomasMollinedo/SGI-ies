import { FOOTER } from '@/features/ecommerce/config/sitioPublico.config'

/**
 * Pie del sitio público: una sola línea con el copyright, sobre un tono más
 * oscuro que el resto de la página (`dark-deep`) y con la línea terracota
 * arriba. Los datos de contacto viven en la sección Consultanos y no se
 * repiten acá.
 */
export function SitioPublicoFooter() {
  return (
    <footer className="bg-dark-deep border-primary border-t">
      <p className="text-light/50 mx-auto max-w-7xl px-4 py-8 font-mono text-xs tracking-widest uppercase sm:px-6 lg:px-8">
        © {new Date().getFullYear()} {FOOTER.copyright}
      </p>
    </footer>
  )
}
