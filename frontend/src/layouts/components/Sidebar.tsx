import { useEffect, useRef, useState } from 'react'
import { ChevronRight, LogOut } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import logo from '@/assets/logo.svg'
import { useAuthUser } from '@/features/auth/hooks/useAuthUser'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { NAV_ITEMS, recolectarRamaActiva, type NavNode } from '@/layouts/navItems'

const navLinkClase = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-xs ${
    isActive ? 'bg-secondary text-content' : 'text-light hover:bg-light/10'
  }`

interface SidebarProps {
  abierto: boolean
  onCerrar: () => void
}

export function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const location = useLocation()
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(
    () => new Set(recolectarRamaActiva(NAV_ITEMS, location.pathname))
  )

  function alternarGrupo(to: string) {
    setGruposAbiertos((actual) => {
      const siguiente = new Set(actual)
      if (siguiente.has(to)) {
        siguiente.delete(to)
      } else {
        siguiente.add(to)
      }
      return siguiente
    })
  }

  return (
    <>
      {abierto ? (
        <div className="bg-dark/50 fixed inset-0 z-30 md:hidden" onClick={onCerrar} />
      ) : null}
      <aside
        className={`bg-dark border-subtle fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-subtle flex h-20 items-center border-b px-4">
          <img src={logo} alt="IES" className="h-16 w-auto" />
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto px-2 py-4">
          {NAV_ITEMS.map((item) => (
            <SidebarNode
              key={item.to}
              node={item}
              pathname={location.pathname}
              gruposAbiertos={gruposAbiertos}
              onAlternar={alternarGrupo}
              onNavegar={onCerrar}
            />
          ))}
        </nav>
        <div className="mt-auto">
          <UserMenu />
        </div>
      </aside>
    </>
  )
}

interface SidebarNodeProps {
  node: NavNode
  pathname: string
  gruposAbiertos: Set<string>
  onAlternar: (to: string) => void
  onNavegar: () => void
}

function SidebarNode({ node, pathname, gruposAbiertos, onAlternar, onNavegar }: SidebarNodeProps) {
  const Icon = node.icon

  if (!node.children) {
    return (
      <NavLink to={node.to} end className={navLinkClase} onClick={onNavegar}>
        <span className="flex items-center gap-2">
          <Icon size={14} className="shrink-0" />
          {node.label}
        </span>
      </NavLink>
    )
  }

  const abierto = gruposAbiertos.has(node.to)
  const activo = pathname.startsWith(node.to)

  return (
    <div>
      <button
        type="button"
        onClick={() => onAlternar(node.to)}
        className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-xs ${
          activo ? 'bg-primary text-fondotabla' : 'text-light hover:bg-light/10'
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon size={14} className="shrink-0" />
          {node.label}
        </span>
        <ChevronRight
          size={14}
          className={`shrink-0 transition-transform duration-200 ease-in-out ${
            abierto ? 'rotate-90' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-subtle mt-1 ml-3 flex flex-col gap-1 border-l pl-2">
            {node.children.map((child) => (
              <SidebarNode
                key={child.to}
                node={child}
                pathname={pathname}
                gruposAbiertos={gruposAbiertos}
                onAlternar={onAlternar}
                onNavegar={onNavegar}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
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
          className="text-light hover:bg-light/10 mb-1 flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs"
        >
          <LogOut size={14} />
          {cerrandoSesion ? 'Saliendo...' : 'Salir'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="hover:bg-light/10 flex w-full items-center gap-3 rounded px-2 py-2 text-left"
      >
        <span className="bg-primary text-primary-content flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {usuario.nombre.charAt(0)}
          {usuario.apellido.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="text-light block truncate text-xs font-medium">
            {usuario.nombre} {usuario.apellido}
          </span>
          <span className="text-light/60 block truncate text-[0.6875rem]">{usuario.rol}</span>
        </span>
      </button>
    </div>
  )
}
