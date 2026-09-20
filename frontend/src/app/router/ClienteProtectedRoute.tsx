import { Navigate, Outlet, useLocation } from 'react-router'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { PATHS } from './paths'

interface ClienteProtectedRouteProps {
  /** Con sesión pero sin dni_cuil o teléfono, manda a completar los datos (HU-29). */
  requiereDatosCompletos?: boolean
}

export function ClienteProtectedRoute({
  requiereDatosCompletos = false,
}: ClienteProtectedRouteProps) {
  // isLoading (no isPending): sin bandera de sesión previa la query queda
  // deshabilitada y isPending sería true para siempre — el visitante nunca
  // llegaría al redirect al login.
  const { data: cliente, isLoading } = useClienteAuthUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={32} />
      </div>
    )
  }

  if (!cliente) {
    return <Navigate to={PATHS.ECOMMERCE.LOGIN} state={{ from: location }} replace />
  }

  if (requiereDatosCompletos && (cliente.dni_cuil === null || cliente.telefono === null)) {
    return <Navigate to={PATHS.ECOMMERCE.COMPLETAR_DATOS} state={{ from: location }} replace />
  }

  return <Outlet />
}
