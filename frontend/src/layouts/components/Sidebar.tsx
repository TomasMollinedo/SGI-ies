import { NavLink } from 'react-router'
import { PATHS } from '@/app/router/paths'

const ITEMS = [
  { label: 'Inicio', to: PATHS.HOME },
  { label: 'Almacén', to: PATHS.ALMACEN.ROOT },
  { label: 'Compras', to: PATHS.COMPRAS.ROOT },
  { label: 'Tesorería', to: PATHS.TESORERIA.ROOT },
  { label: 'Proyectos', to: PATHS.PROYECTOS.ROOT },
  { label: 'Comercial', to: PATHS.COMERCIAL.ROOT },
  { label: 'Sistema', to: PATHS.SISTEMA.ROOT },
]

export function Sidebar() {
  return (
    <aside className="bg-surface border-subtle w-56 shrink-0 border-r p-4">
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === PATHS.HOME}
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm ${
                isActive ? 'bg-primary text-primary-content' : 'text-content hover:bg-surface-muted'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
