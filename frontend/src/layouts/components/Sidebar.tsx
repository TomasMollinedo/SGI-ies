import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import logo from '@/assets/logo.svg'
import { PATHS } from '@/app/router/paths'
import { useAuthUser } from '@/features/auth/hooks/useAuthUser'
import { useLogout } from '@/features/auth/hooks/useLogout'

interface NavChild {
  label: string
  to: string
}

interface NavItem {
  label: string
  to: string
  children?: NavChild[]
}

const ITEMS: NavItem[] = [
  // { label: 'Inicio', to: PATHS.HOME },
  {
    label: 'Almacén',
    to: PATHS.ALMACEN.ROOT,
    children: [
      { label: 'Catálogo de Artículos', to: PATHS.ALMACEN.CATALOGO.ROOT },
      { label: 'Depósito/Obradores', to: PATHS.ALMACEN.DEPOSITO.ROOT },
      { label: 'Movimientos', to: PATHS.ALMACEN.MOVIMIENTOS.ROOT },
    ],
  },
  // { label: 'Compras', to: PATHS.COMPRAS.ROOT },
  // { label: 'Tesorería', to: PATHS.TESORERIA.ROOT },
  // { label: 'Proyectos', to: PATHS.PROYECTOS.ROOT },
  // { label: 'Comercial', to: PATHS.COMERCIAL.ROOT },
  // { label: 'Sistema', to: PATHS.SISTEMA.ROOT },
]

const navLinkClase = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-2 text-sm ${
    isActive ? 'bg-secondary text-content' : 'text-light hover:bg-light/10'
  }`

export function Sidebar() {
  const location = useLocation()
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(
    () => ITEMS.find((item) => item.children && location.pathname.startsWith(item.to))?.to ?? null
  )

  return (
    <aside className="bg-dark border-subtle flex w-64 shrink-0 flex-col border-r">
      <div className="border-subtle flex h-24 items-center justify-start gap-2 border-b  pl-0">
        <img src={logo} alt="IES" className="h-40 w-40 bg-center mt-4" />
      </div>
      <nav className="flex flex-col gap-1 px-2 py-6">

        {ITEMS.map((item) =>
          item.children ? (
            <div key={item.to}>
              <button
                type="button"
                onClick={() => setGrupoAbierto((actual) => (actual === item.to ? null : item.to))}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
                  location.pathname.startsWith(item.to)
                    ? 'bg-primary text-fondotabla'
                    : 'text-light hover:bg-light/10'
                }`}
              >
                {item.label}
                {grupoAbierto === item.to ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {grupoAbierto === item.to ? (
                <div className="mt-1 flex flex-col gap-1 pl-3">
                  {item.children.map((child) => (
                    <NavLink key={child.to} to={child.to} className={navLinkClase}>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <NavLink 
              key={item.to}
              to={item.to}
              end={item.to === PATHS.HOME}
              className={navLinkClase}
            >
              {item.label}
            </NavLink>
          )
        )}
      </nav>
      <div className="mt-auto">
        <UserMenu />
      </div>
    </aside>
  )
}

function UserMenu() {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const { data: usuario } = useAuthUser()
  const { mutate: cerrarSesion, isPending: cerrandoSesion } = useLogout()

  useEffect(() => {
    if (!abierto) return

    function handleClickFuera(event: MouseEvent) {
      if (!contenedorRef.current?.contains(event.target as Node)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [abierto])

  if (!usuario) {
    return null
  }

  return (
    <div ref={contenedorRef} className="border-subtle relative border-t p-3">
      {abierto ? (
        <button
          type="button"
          onClick={() => cerrarSesion()}
          disabled={cerrandoSesion}
          className="text-light hover:bg-light/10 mb-1 flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
        >
          <LogOut size={16} />
          {cerrandoSesion ? 'Saliendo...' : 'Salir'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="hover:bg-light/10 flex w-full items-center gap-3 rounded px-2 py-2 text-left"
      >
        <span className="bg-primary text-primary-content flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {usuario.nombre.charAt(0)}
          {usuario.apellido.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="text-light block truncate text-sm font-medium">
            {usuario.nombre} {usuario.apellido}
          </span>
          <span className="text-light/60 block truncate text-xs">{usuario.rol}</span>
        </span>
      </button>
    </div>
  )
}
