import { Outlet } from 'react-router'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'

export function MainLayout() {
  return (
    <div className="bg-surface-muted flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
