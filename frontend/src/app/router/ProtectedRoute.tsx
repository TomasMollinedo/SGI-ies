import { Navigate, Outlet } from 'react-router'
import { useAuthUser } from '@/features/auth/hooks/useAuthUser'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { PATHS } from './paths'

export function ProtectedRoute() {
  const { data: usuario, isPending } = useAuthUser()

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to={PATHS.LOGIN} replace />
  }

  return <Outlet />
}
