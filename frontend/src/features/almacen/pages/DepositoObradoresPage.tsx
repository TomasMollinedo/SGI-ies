import { Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { PageTabs } from '@/shared/components/PageTabs'

const TABS = [
  { label: 'Depósito de Obradores', to: PATHS.ALMACEN.DEPOSITO.OBRADORES },
  { label: 'Stock por Depósito', to: PATHS.ALMACEN.DEPOSITO.STOCK },
]

export function DepositoObradoresPage() {
  return (
    <section className="space-y-4">
      <PageTabs tabs={TABS} />
      <Outlet />
    </section>
  )
}
