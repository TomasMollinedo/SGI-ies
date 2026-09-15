import { Navigate } from 'react-router'
import { useAuthUser } from '@/features/auth/hooks/useAuthUser'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { PATHS } from './paths'

/**
 * Hasta que exista login de cliente (HU-23), no hay forma de distinguir a un
 * visitante público de alguien que simplemente no inició sesión como staff.
 * Por eso "/" redirige a /login sin sesión, y solo muestra la landing una vez
 * autenticado. Cuando el ecommerce tenga su propio login, esta ruta debe
 * pasar a ser 100% pública (sin este chequeo).
 */
export function HomeRoute() {
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

  return <PlaceholderPage titulo="Inicio" historia="HU-24" />
}
