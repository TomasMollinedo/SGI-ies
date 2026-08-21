import { Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { PageTabs } from '@/shared/components/PageTabs'

const TABS = [
  { label: 'Artículos', to: PATHS.ALMACEN.CATALOGO.ARTICULOS },
  { label: 'Marcas', to: PATHS.ALMACEN.CATALOGO.MARCAS },
  { label: 'Categorías', to: PATHS.ALMACEN.CATALOGO.CATEGORIAS },
  { label: 'Unidades de Medida', to: PATHS.ALMACEN.CATALOGO.UNIDADES_MEDIDA },
]

export function CatalogoArticulosPage() {
  return (
    <section className="space-y-4">
      <div className="bg-fondotabla -mx-6 -mt-4 px-6 pt-4">
        <PageTabs tabs={TABS} />
      </div>
      <Outlet />
    </section>
  )
}
