import { Navigate, Outlet } from 'react-router'
import { useAuthUser } from '@/features/auth/hooks/useAuthUser'
import { PATHS } from './paths'

export function ProtectedRoute() {
  const { data: usuario, isPending } = useAuthUser()

  if (isPending) {
    return <div>Cargando...</div>
  }

  if (!usuario) {
    return <Navigate to={PATHS.LOGIN} replace />
  }

  return <Outlet />
}
