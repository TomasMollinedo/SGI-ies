import { Link } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'

const SIN_DATO = '—'

export function PerfilPage() {
  const { data: cliente } = useClienteAuthUser()

  // ClienteProtectedRoute ya garantiza que hay sesión al llegar acá.
  if (!cliente) return null

  return (
    <div className="bg-surface-muted flex justify-center px-4 py-12 sm:py-16">
      <div className="bg-fondotabla h-fit w-full max-w-lg rounded-2xl p-6 shadow-xl sm:p-10">
        <h1 className="text-titulo-modal text-content mb-6 font-semibold">Mi perfil</h1>

        <div>
          <DetailRow label="Nombre" value={cliente.nombre} />
          <DetailRow label="Apellido" value={cliente.apellido ?? SIN_DATO} />
          <DetailRow label="Email" value={cliente.email} />
          <DetailRow label="DNI / CUIT" value={cliente.dni_cuil ?? SIN_DATO} />
          <DetailRow label="Teléfono" value={cliente.telefono ?? SIN_DATO} />
        </div>

        <Link
          to={PATHS.ECOMMERCE.COMPLETAR_DATOS}
          className="bg-primary text-primary-content mt-8 block rounded-xl px-4 py-2 text-center text-sm font-semibold transition-opacity hover:opacity-90 sm:inline-block"
        >
          Editar mis datos
        </Link>
      </div>
    </div>
  )
}
