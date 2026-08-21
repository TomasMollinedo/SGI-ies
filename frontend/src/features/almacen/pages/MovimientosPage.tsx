import { Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { PageTabs } from '@/shared/components/PageTabs'

const TABS = [
  { label: 'Movimientos', to: PATHS.ALMACEN.MOVIMIENTOS.ROOT },
  { label: 'Tipos de Movimiento', to: PATHS.ALMACEN.MOVIMIENTOS.TIPOS },
]

export function MovimientosPage() {
  return (
    <section className="space-y-4">
      <div className="bg-fondotabla -mx-6 -mt-4 px-6 pt-4">
        <PageTabs tabs={TABS} />
      </div>
      <Outlet />
    </section>
  )
}
