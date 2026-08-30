import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'

export function MainLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="bg-surface-muted relative flex h-screen">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 overflow-y-auto px-6 py-4">
          <Outlet />
        </main>
      </div>
      {/* Une los border-b del logo y el header, que al hacer zoom pueden redondearse a píxeles distintos */}
      <div className="border-subtle pointer-events-none absolute inset-x-0 top-20 hidden border-t md:block" />
    </div>
  )
}
